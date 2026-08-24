import { describe, it, expect } from 'vitest'
import {
  migrateState,
  emptyState,
  makeProfile,
  writeLegacyMirror,
  reconcileLegacyMirror,
  primaryWombProfile,
  orderedProfiles,
  newProfileId,
  LEGACY_PROFILE_ID,
  STATE_VERSION
} from '../../src/services/familyState.js'

/** A version 1 blob as the shipped Birth Calendar writes it. */
function legacyBlob(overrides = {}) {
  return {
    version: 1,
    dueDate: '2026-12-01T00:00:00.000Z',
    babyName: 'Hope',
    favourites: { 'day:47': '2026-08-01T10:00:00.000Z', 'week:12': '2026-08-02T10:00:00.000Z' },
    journal: { 47: { text: 'Felt the first kick.', updatedAt: '2026-08-01T10:05:00.000Z' } },
    spoken: { 46: '2026-07-31T08:00:00.000Z', 47: '2026-08-01T08:00:00.000Z' },
    lastReminderKey: '2026-08-01',
    settings: { voice: 'partner', reminderTime: '07:30', remindersEnabled: true },
    updatedAt: '2026-08-01T10:05:00.000Z',
    ...overrides
  }
}

describe('migrateState — from version 1', () => {
  it('moves the pregnancy into a profile without losing anything', () => {
    const state = migrateState(legacyBlob())
    const profile = state.profiles[LEGACY_PROFILE_ID]

    expect(state.version).toBe(STATE_VERSION)
    expect(profile).toBeTruthy()
    expect(profile.kind).toBe('womb')
    expect(profile.name).toBe('Hope')
    expect(profile.dueDate).toBe('2026-12-01T00:00:00.000Z')
    expect(state.activeProfileId).toBe(LEGACY_PROFILE_ID)

    const data = state.data[LEGACY_PROFILE_ID]
    expect(data.favourites).toEqual(legacyBlob().favourites)
    expect(data.journal).toEqual(legacyBlob().journal)
    expect(data.spoken).toEqual(legacyBlob().spoken)
    expect(data.lastReminderKey).toBe('2026-08-01')
  })

  it('keeps the user settings', () => {
    const state = migrateState(legacyBlob())
    expect(state.settings.voice).toBe('partner')
    expect(state.settings.reminderTime).toBe('07:30')
    expect(state.settings.remindersEnabled).toBe(true)
    // and fills in the ones a version 1 blob never had
    expect(state.settings.fontScale).toBe(1)
  })

  it('mints the same profile id on every device', () => {
    // Two devices migrating the same account offline must not end up with two
    // children; the merge unions profiles by id.
    const a = migrateState(legacyBlob())
    const b = migrateState(legacyBlob())
    expect(Object.keys(a.profiles)).toEqual(Object.keys(b.profiles))
  })

  it('creates no profile for someone who never onboarded', () => {
    const state = migrateState({
      version: 1,
      dueDate: null,
      babyName: '',
      favourites: {},
      journal: {},
      spoken: {},
      settings: { fontScale: 1.25 }
    })
    expect(Object.keys(state.profiles)).toHaveLength(0)
    expect(state.activeProfileId).toBeNull()
    expect(state.settings.fontScale).toBe(1.25)
  })

  it('is idempotent — migrating twice changes nothing', () => {
    const once = migrateState(legacyBlob())
    const twice = migrateState(JSON.parse(JSON.stringify(once)))
    expect(twice).toEqual(once)
  })

  it('survives a blob missing every optional field', () => {
    const state = migrateState({ version: 1, dueDate: '2026-12-01T00:00:00.000Z' })
    expect(state.profiles[LEGACY_PROFILE_ID].dueDate).toBe('2026-12-01T00:00:00.000Z')
    expect(state.data[LEGACY_PROFILE_ID].journal).toEqual({})
  })

  it('returns an empty state for junk', () => {
    expect(migrateState(null)).toEqual(emptyState())
    expect(migrateState(undefined)).toEqual(emptyState())
    expect(migrateState('nonsense')).toEqual(emptyState())
    expect(migrateState([1, 2, 3])).toEqual(emptyState())
  })
})

describe('the version 1 mirror', () => {
  it('publishes the womb profile where an old client will find it', () => {
    const state = migrateState(legacyBlob())
    expect(state.dueDate).toBe('2026-12-01T00:00:00.000Z')
    expect(state.babyName).toBe('Hope')
    expect(state.journal).toEqual(state.data[LEGACY_PROFILE_ID].journal)
    expect(state.spoken).toEqual(state.data[LEGACY_PROFILE_ID].spoken)
  })

  it('folds back what a still-on-version-1 client wrote', () => {
    // An old device reads the mirror, adds a day, and pushes the whole blob.
    const pushed = migrateState(legacyBlob())
    pushed.journal[48] = { text: 'Wrote this on the old app.', updatedAt: '2026-08-03T09:00:00Z' }
    pushed.spoken[48] = '2026-08-03T08:00:00.000Z'
    pushed.favourites['day:48'] = '2026-08-03T09:01:00.000Z'

    const reloaded = migrateState(pushed)
    const data = reloaded.data[LEGACY_PROFILE_ID]
    expect(data.journal[48].text).toBe('Wrote this on the old app.')
    expect(data.spoken[48]).toBe('2026-08-03T08:00:00.000Z')
    expect(data.favourites['day:48']).toBe('2026-08-03T09:01:00.000Z')
  })

  it('never lets an old client drop a journal entry it could not see', () => {
    const state = migrateState(legacyBlob())
    // A second child exists; the old client knows nothing about it.
    const other = makeProfile({
      id: 'p_other',
      kind: 'child',
      name: 'Sam',
      birthDate: '2015-04-02'
    })
    state.profiles[other.id] = other
    state.data[other.id] = {
      favourites: {},
      journal: { '2026-08-20': { text: 'School run talk.', updatedAt: '2026-08-20T18:00:00Z' } },
      spoken: {},
      lastReminderKey: null
    }
    // The old client rewrites the mirror with only what it knows.
    state.journal = { 47: { text: 'Felt the first kick.', updatedAt: '2026-08-01T10:05:00.000Z' } }

    const reloaded = migrateState(state)
    expect(reloaded.data.p_other.journal['2026-08-20'].text).toBe('School run talk.')
    expect(reloaded.data[LEGACY_PROFILE_ID].journal[47]).toBeTruthy()
  })

  it('keeps the newer text when both sides edited the same day', () => {
    const state = migrateState(legacyBlob())
    state.journal[47] = { text: 'Edited on the old app.', updatedAt: '2026-08-05T10:00:00.000Z' }
    const reloaded = migrateState(state)
    expect(reloaded.data[LEGACY_PROFILE_ID].journal[47].text).toBe('Edited on the old app.')
  })

  it('empties the mirror when there is no womb profile left', () => {
    const state = emptyState()
    const child = makeProfile({ id: 'p_x', kind: 'child', name: 'Ada', birthDate: '2018-02-02' })
    state.profiles[child.id] = child
    state.data[child.id] = { favourites: {}, journal: {}, spoken: {}, lastReminderKey: null }
    state.babyName = 'stale'
    writeLegacyMirror(state)
    expect(state.babyName).toBe('')
    expect(state.dueDate).toBeNull()
  })

  it('reconciles nothing when the account has no womb profile', () => {
    const state = emptyState()
    expect(reconcileLegacyMirror(state)).toBe(state)
    expect(primaryWombProfile(state)).toBeNull()
  })
})

describe('profiles', () => {
  it('orders oldest first, and breaks ties deterministically', () => {
    const state = emptyState()
    for (const p of [
      makeProfile({ id: 'b', name: 'B', createdAt: '2026-01-02T00:00:00Z' }),
      makeProfile({ id: 'a', name: 'A', createdAt: '2026-01-01T00:00:00Z' }),
      makeProfile({ id: 'c', name: 'C', createdAt: '2026-01-02T00:00:00Z' })
    ]) {
      state.profiles[p.id] = p
    }
    expect(orderedProfiles(state).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('gives a womb profile the womb stage whatever it was asked for', () => {
    expect(makeProfile({ kind: 'womb', stage: 'teen' }).stage).toBe('womb')
  })

  it('falls back to auto for a stage it does not recognise', () => {
    expect(makeProfile({ kind: 'child', stage: 'grandparent' }).stage).toBe('auto')
    expect(makeProfile({ kind: 'child', stage: 'teen' }).stage).toBe('teen')
  })

  it('mints unique ids', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newProfileId()))
    expect(ids.size).toBe(200)
  })

  it('drops junk entries in the profiles map', () => {
    const state = migrateState({
      version: 2,
      profiles: { good: makeProfile({ id: 'good', name: 'Ada' }), bad: null, worse: 7 },
      data: {},
      settings: {}
    })
    expect(Object.keys(state.profiles)).toEqual(['good'])
    expect(state.data.good).toBeTruthy()
  })

  it('picks a sane active profile when the saved one is gone', () => {
    const state = migrateState({
      version: 2,
      profiles: { a: makeProfile({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }) },
      data: {},
      activeProfileId: 'deleted',
      settings: {}
    })
    expect(state.activeProfileId).toBe('a')
  })
})
