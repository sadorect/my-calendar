import { describe, it, expect } from 'vitest'
import { mergeStates, statesDiffer } from '../../src/services/mergeState.js'

const OLD = '2026-08-20T10:00:00.000Z'
const NEW = '2026-08-21T10:00:00.000Z'

function blob(overrides = {}) {
  return {
    version: 1,
    dueDate: '2026-12-01T00:00:00.000Z',
    babyName: '',
    favourites: {},
    journal: {},
    spoken: {},
    lastReminderKey: null,
    settings: { voice: 'parents' },
    updatedAt: OLD,
    ...overrides
  }
}

describe('mergeStates', () => {
  it('returns the other side when one is missing', () => {
    const local = blob()
    expect(mergeStates(local, null)).toBe(local)
    expect(mergeStates(null, local)).toBe(local)
  })

  it('never loses a journal entry that only one device has', () => {
    const local = blob({ journal: { 10: { text: 'Local note', updatedAt: OLD } } })
    const remote = blob({ journal: { 20: { text: 'Remote note', updatedAt: OLD } } })
    const merged = mergeStates(local, remote)
    expect(merged.journal[10].text).toBe('Local note')
    expect(merged.journal[20].text).toBe('Remote note')
  })

  it('keeps the later edit of the same journal day', () => {
    const local = blob({ journal: { 10: { text: 'Newer', updatedAt: NEW } } })
    const remote = blob({ journal: { 10: { text: 'Older', updatedAt: OLD } } })
    expect(mergeStates(local, remote).journal[10].text).toBe('Newer')
    expect(mergeStates(remote, local).journal[10].text).toBe('Newer')
  })

  it('keeps both texts when the same day was edited at the same instant', () => {
    // Losing half of what someone wrote is worse than showing a visible join.
    const local = blob({ journal: { 10: { text: 'From the phone', updatedAt: OLD } } })
    const remote = blob({ journal: { 10: { text: 'From the laptop', updatedAt: OLD } } })
    const merged = mergeStates(local, remote)
    expect(merged.journal[10].text).toContain('From the phone')
    expect(merged.journal[10].text).toContain('From the laptop')
  })

  it('unions favourites and keeps the earliest save', () => {
    const local = blob({ favourites: { 'day:5': NEW, 'day:9': NEW } })
    const remote = blob({ favourites: { 'day:5': OLD, 'week:3': OLD } })
    const merged = mergeStates(local, remote)
    expect(Object.keys(merged.favourites).sort()).toEqual(['day:5', 'day:9', 'week:3'])
    expect(merged.favourites['day:5']).toBe(OLD)
  })

  it('unions spoken days so a streak survives a merge', () => {
    const local = blob({ spoken: { 1: OLD, 2: OLD } })
    const remote = blob({ spoken: { 2: NEW, 3: NEW } })
    expect(Object.keys(mergeStates(local, remote).spoken).sort()).toEqual(['1', '2', '3'])
  })

  it('takes scalars and settings from the newer blob as a set', () => {
    const local = blob({ updatedAt: NEW, babyName: 'Ada', settings: { voice: 'partner' } })
    const remote = blob({ updatedAt: OLD, babyName: 'Baby', settings: { voice: 'parents' } })
    const merged = mergeStates(local, remote)
    expect(merged.babyName).toBe('Ada')
    expect(merged.settings.voice).toBe('partner')

    const other = mergeStates(remote, local)
    expect(other.babyName).toBe('Ada')
    expect(other.settings.voice).toBe('partner')
  })

  it('takes the later reminder key so a merge cannot re-fire today', () => {
    const local = blob({ lastReminderKey: '2026-08-21' })
    const remote = blob({ lastReminderKey: '2026-08-19' })
    expect(mergeStates(local, remote).lastReminderKey).toBe('2026-08-21')
    expect(mergeStates(remote, local).lastReminderKey).toBe('2026-08-21')
  })

  it('is symmetric for the parts that must be', () => {
    const local = blob({
      updatedAt: NEW,
      favourites: { 'day:1': OLD },
      spoken: { 1: OLD },
      journal: { 5: { text: 'a', updatedAt: NEW } }
    })
    const remote = blob({
      updatedAt: OLD,
      favourites: { 'day:2': OLD },
      spoken: { 2: OLD },
      journal: { 6: { text: 'b', updatedAt: OLD } }
    })
    const a = mergeStates(local, remote)
    const b = mergeStates(remote, local)
    expect(a.favourites).toEqual(b.favourites)
    expect(a.spoken).toEqual(b.spoken)
    expect(a.journal).toEqual(b.journal)
  })

  it('does not mutate either input', () => {
    const local = blob({ favourites: { 'day:1': OLD } })
    const remote = blob({ favourites: { 'day:2': OLD } })
    const localCopy = JSON.parse(JSON.stringify(local))
    const remoteCopy = JSON.parse(JSON.stringify(remote))
    mergeStates(local, remote)
    expect(local).toEqual(localCopy)
    expect(remote).toEqual(remoteCopy)
  })

  it('stamps the merge with the time of the merge', () => {
    const before = Date.now()
    const merged = mergeStates(blob(), blob())
    expect(Date.parse(merged.updatedAt)).toBeGreaterThanOrEqual(before)
  })
})

describe('statesDiffer', () => {
  it('ignores updatedAt, which always differs after a merge', () => {
    expect(statesDiffer(blob({ updatedAt: OLD }), blob({ updatedAt: NEW }))).toBe(false)
  })

  it('sees a real change', () => {
    expect(statesDiffer(blob(), blob({ babyName: 'Ada' }))).toBe(true)
  })

  it('treats a missing side as different', () => {
    expect(statesDiffer(null, blob())).toBe(true)
  })
})
