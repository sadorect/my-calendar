import { describe, it, expect } from 'vitest'
import {
  migrateState,
  emptyState,
  makePrayer,
  cleanPrayers,
  livePrayers,
  unionPrayers,
  newPrayerId,
  STATE_VERSION
} from '../../src/services/familyState.js'
import { mergeStates, statesDiffer } from '../../src/services/mergeState.js'

const T1 = '2026-09-01T10:00:00.000Z'
const T2 = '2026-09-02T10:00:00.000Z'
const T3 = '2026-09-03T10:00:00.000Z'

function prayer(id, over = {}) {
  return makePrayer({ id, text: `Prayer ${id}`, createdAt: T1, updatedAt: T1, ...over })
}

function v2(overrides = {}) {
  return {
    version: STATE_VERSION,
    profiles: {},
    data: {},
    activeProfileId: null,
    settings: {},
    updatedAt: T1,
    ...overrides
  }
}

describe('makePrayer', () => {
  it('fills defaults and mints an id', () => {
    const p = makePrayer({ text: ' Safe delivery ' })
    expect(p.id).toMatch(/^pr_/)
    expect(p.status).toBe('praying')
    expect(p.answer).toBe('')
    expect(p.profileId).toBeNull()
    expect(p.source).toBeNull()
    expect(p.deletedAt).toBeNull()
    expect(p.updatedAt).toBe(p.createdAt)
  })

  it('keeps a well-formed source and drops a keyless one', () => {
    expect(
      makePrayer({ source: { stage: 'school', key: 'school:m03:d17', title: 'Wise' } }).source
    ).toEqual({ stage: 'school', key: 'school:m03:d17', title: 'Wise' })
    expect(makePrayer({ source: { title: 'no key' } }).source).toBeNull()
  })

  it('refuses an unknown status', () => {
    expect(makePrayer({ status: 'maybe' }).status).toBe('praying')
    expect(makePrayer({ status: 'answered' }).status).toBe('answered')
  })

  it('mints distinct ids', () => {
    expect(newPrayerId()).not.toBe(newPrayerId())
  })
})

describe('the prayers map survives every load', () => {
  it('is empty on a fresh state and on a version 1 blob', () => {
    expect(emptyState().prayers).toEqual({})
    expect(migrateState({ version: 1, dueDate: '2026-12-01', babyName: 'Hope' }).prayers).toEqual(
      {}
    )
  })

  it('is filled in for a version 2 blob written before prayers existed', () => {
    expect(migrateState(v2()).prayers).toEqual({})
  })

  it('round-trips through migrateState unchanged', () => {
    const state = v2({
      prayers: { a: prayer('a'), b: prayer('b', { status: 'answered', answeredAt: T2 }) }
    })
    expect(migrateState(state).prayers).toEqual(state.prayers)
    expect(migrateState(migrateState(state)).prayers).toEqual(state.prayers)
  })

  it('drops junk entries and repairs partial ones', () => {
    const cleaned = cleanPrayers({ a: { text: 'Only text' }, b: 'nope', c: null })
    expect(Object.keys(cleaned)).toEqual(['a'])
    expect(cleaned.a.id).toBe('a')
    expect(cleaned.a.status).toBe('praying')
  })
})

describe('livePrayers', () => {
  it('hides tombstones and puts open prayers first, newest first', () => {
    const state = v2({
      prayers: {
        old: prayer('old', { createdAt: T1 }),
        gone: prayer('gone', { deletedAt: T3 }),
        done: prayer('done', { status: 'answered', createdAt: T3 }),
        recent: prayer('recent', { createdAt: T2 })
      }
    })
    expect(livePrayers(state).map((p) => p.id)).toEqual(['recent', 'old', 'done'])
  })
})

describe('unionPrayers', () => {
  it('keeps an entry only one side has', () => {
    const out = unionPrayers({ a: prayer('a') }, { b: prayer('b') })
    expect(Object.keys(out).sort()).toEqual(['a', 'b'])
  })

  it('takes the later edit', () => {
    const out = unionPrayers(
      { a: prayer('a', { text: 'first', updatedAt: T1 }) },
      { a: prayer('a', { text: 'second', updatedAt: T2 }) }
    )
    expect(out.a.text).toBe('second')
  })

  it('lets a newer tombstone beat an older edit, and an older tombstone lose to a newer one', () => {
    const del = prayer('a', { deletedAt: T2, updatedAt: T2 })
    const edit = prayer('a', { text: 'edited', updatedAt: T1 })
    expect(unionPrayers({ a: del }, { a: edit }).a.deletedAt).toBe(T2)
    const later = prayer('a', { text: 'edited later', updatedAt: T3 })
    expect(unionPrayers({ a: del }, { a: later }).a.deletedAt).toBeNull()
  })

  it('keeps both texts on a same-instant conflict', () => {
    const out = unionPrayers(
      { a: prayer('a', { text: 'mine', updatedAt: T1 }) },
      { a: prayer('a', { text: 'theirs', updatedAt: T1 }) }
    )
    expect(out.a.text).toContain('mine')
    expect(out.a.text).toContain('theirs')
  })
})

describe('mergeStates with prayers', () => {
  it('does not let a device that never saw prayers erase them', () => {
    const withPrayers = v2({ prayers: { a: prayer('a') }, updatedAt: T1 })
    const staleButNewer = v2({ updatedAt: T3 })
    expect(mergeStates(withPrayers, staleButNewer).prayers.a).toBeTruthy()
    expect(mergeStates(staleButNewer, withPrayers).prayers.a).toBeTruthy()
  })

  it('does not let a version 1 device erase them either', () => {
    const withPrayers = v2({ prayers: { a: prayer('a') }, updatedAt: T1 })
    const v1 = { version: 1, dueDate: '2026-12-01', babyName: 'Hope', updatedAt: T3 }
    expect(mergeStates(withPrayers, v1).prayers.a).toBeTruthy()
  })

  it('carries an answer from one device and a new request from the other', () => {
    const local = v2({
      prayers: {
        a: prayer('a', { status: 'answered', answer: 'Yes', answeredAt: T2, updatedAt: T2 })
      }
    })
    const remote = v2({
      prayers: { a: prayer('a'), b: prayer('b', { createdAt: T2 }) },
      updatedAt: T2
    })
    const merged = mergeStates(local, remote)
    expect(merged.prayers.a.status).toBe('answered')
    expect(merged.prayers.a.answer).toBe('Yes')
    expect(merged.prayers.b).toBeTruthy()
  })

  it('counts a prayer change as a difference worth pushing', () => {
    const a = migrateState(v2())
    const b = migrateState(v2({ prayers: { a: prayer('a') } }))
    expect(statesDiffer(a, b)).toBe(true)
  })

  it('leaves the version 1 mirror untouched', () => {
    const merged = mergeStates(v2({ prayers: { a: prayer('a') } }), v2())
    expect(merged.journal).toEqual({})
    expect(merged.version).toBe(STATE_VERSION)
  })
})
