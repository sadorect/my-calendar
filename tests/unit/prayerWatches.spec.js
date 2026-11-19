import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  PRAYER_WATCHES,
  watchAt,
  timeInWatch,
  cleanWatchSelection,
  watchWindowLabel
} from '../../src/data/prayerWatches.js'
import {
  lastOccurrence,
  dueWatches,
  nextWatchAt,
  watchPayload,
  createWatchReminders,
  skipCurrentOccurrence,
  loadFired
} from '../../src/services/prayerWatchReminders.js'
import {
  buildWatchCalendar,
  googleCalendarLink,
  escapeText,
  foldLine
} from '../../src/services/prayerWatchCalendar.js'

function memoryStorage() {
  const data = {}
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    data
  }
}

const at = (h, m = 0, d = 19) => new Date(2026, 10, d, h, m)

describe('the eight watches', () => {
  it('cover all 24 hours exactly once, starting at 6pm', () => {
    expect(PRAYER_WATCHES).toHaveLength(8)
    expect(PRAYER_WATCHES[0].start).toBe(18)
    const hours = PRAYER_WATCHES.flatMap((w) => [w.start, w.start + 1, w.start + 2])
    expect([...hours].sort((a, b) => a - b)).toEqual([...Array(24).keys()])
  })

  it('each has a focus, a quoted verse, a prompt and references', () => {
    for (const w of PRAYER_WATCHES) {
      expect(w.focus.length).toBeGreaterThan(10)
      expect(w.verse.ref).toMatch(/\d+:\d+/)
      expect(w.verse.text.length).toBeGreaterThan(30)
      expect(w.prompt.length).toBeGreaterThan(60)
      expect(w.references.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('finds the watch for a moment', () => {
    expect(watchAt(at(18)).id).toBe('w1')
    expect(watchAt(at(23, 59)).id).toBe('w2')
    expect(watchAt(at(0)).id).toBe('w3')
    expect(watchAt(at(3, 30)).id).toBe('w4')
    expect(watchAt(at(17, 59)).id).toBe('w8')
  })

  it('labels windows on a 12-hour clock', () => {
    expect(watchWindowLabel(PRAYER_WATCHES[1], 'en-GB')).toBe('9pm–12am')
    expect(watchWindowLabel(PRAYER_WATCHES[2], 'en-US')).toBe('12am–3am')
  })

  it('accepts a time only inside its watch', () => {
    const third = PRAYER_WATCHES[2]
    expect(timeInWatch(third, '00:00')).toBe(true)
    expect(timeInWatch(third, '02:59')).toBe(true)
    expect(timeInWatch(third, '03:00')).toBe(false)
    expect(timeInWatch(PRAYER_WATCHES[1], '23:59')).toBe(true)
  })

  it('cleans a synced selection: unknown ids dropped, bad times reset', () => {
    expect(
      cleanWatchSelection({ w3: '00:30', w4: '09:00', w9: '01:00', w5: 'nonsense', w6: '9:15' })
    ).toEqual({ w3: '00:30', w4: '03:00', w5: '06:00', w6: '09:15' })
    expect(cleanWatchSelection(null)).toEqual({})
    expect(cleanWatchSelection(['w1'])).toEqual({})
  })
})

describe('watch reminder timing', () => {
  it('finds the most recent occurrence, including yesterday', () => {
    expect(lastOccurrence('03:00', at(4)).getDate()).toBe(19)
    expect(lastOccurrence('21:00', at(4)).getDate()).toBe(18)
  })

  it('is due once the time has come and while the watch is open', () => {
    const due = dueWatches({ selection: { w4: '03:00' }, now: at(3, 10) })
    expect(due.map((d) => d.watch.id)).toEqual(['w4'])
    expect(due[0].key).toBe('2026-11-19')
  })

  it('is not due before its time', () => {
    expect(dueWatches({ selection: { w4: '03:30' }, now: at(3, 10) })).toEqual([])
  })

  it('is dropped once the watch has closed — no 3am reminder at breakfast', () => {
    expect(dueWatches({ selection: { w4: '03:00' }, now: at(6, 0) })).toEqual([])
    expect(dueWatches({ selection: { w3: '00:00' }, now: at(8, 0) })).toEqual([])
  })

  it('keeps the second watch due up to midnight', () => {
    expect(dueWatches({ selection: { w2: '21:00' }, now: at(23, 59) })).toHaveLength(1)
    expect(dueWatches({ selection: { w2: '21:00' }, now: at(0, 0, 20) })).toEqual([])
  })

  it('does not repeat an occurrence already delivered', () => {
    expect(
      dueWatches({ selection: { w4: '03:00' }, now: at(3, 10), fired: { w4: '2026-11-19' } })
    ).toEqual([])
    expect(
      dueWatches({ selection: { w4: '03:00' }, now: at(3, 10), fired: { w4: '2026-11-18' } })
    ).toHaveLength(1)
  })

  it('wakes for the soonest selected watch', () => {
    const next = nextWatchAt({ w1: '18:00', w3: '00:30', w5: '06:00' }, at(19))
    expect(next).toEqual(new Date(2026, 10, 20, 0, 30))
    expect(nextWatchAt({}, at(19))).toBeNull()
  })

  it('builds a notification that opens the watch', () => {
    const payload = watchPayload(PRAYER_WATCHES[2])
    expect(payload.title).toBe('Third watch · 12am–3am')
    expect(payload.body).toContain('Acts 16:25')
    expect(payload.url).toBe('/?calendar=birth&watch=w3')
    expect(payload.body.length).toBeLessThan(220)
  })
})

describe('createWatchReminders', () => {
  let storage
  let delivered
  let clock

  beforeEach(() => {
    vi.useFakeTimers()
    storage = memoryStorage()
    delivered = []
    clock = at(2, 55)
    vi.setSystemTime(clock)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function make(selection) {
    return createWatchReminders({
      getSelection: () => selection,
      deliver: (watch) => delivered.push(watch.id),
      storage,
      now: () => new Date()
    })
  }

  it('fires when the watch opens while the app is running, once', async () => {
    const r = make({ w4: '03:00' })
    await r.start()
    expect(delivered).toEqual([])
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(delivered).toEqual(['w4'])
    await r.sync()
    expect(delivered).toEqual(['w4'])
    expect(loadFired(storage)).toEqual({ w4: '2026-11-19' })
    r.stop()
  })

  it('catches up on open only while the watch is still open', async () => {
    vi.setSystemTime(at(4, 0))
    const r = make({ w3: '00:00', w4: '03:00' })
    await r.start()
    expect(delivered).toEqual(['w4'])
    r.stop()
  })

  it('stops cleanly', async () => {
    const r = make({ w4: '03:00' })
    await r.start()
    r.stop()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(delivered).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('switching a watch on mid-watch does not ring straight away', async () => {
    vi.setSystemTime(at(3, 30))
    skipCurrentOccurrence('w4', '03:00', new Date(), storage)
    const r = make({ w4: '03:00' })
    await r.start()
    expect(delivered).toEqual([])
    r.stop()
  })
})

describe('calendar export', () => {
  const now = at(10)

  it('writes one daily repeating event with an alarm per selected watch', () => {
    const ics = buildWatchCalendar({ w3: '00:30', w8: '15:00' }, { now })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(ics).toContain('DTSTART:20261119T003000')
    expect(ics).toContain('DTSTART:20261119T150000')
    expect(ics).toContain('UID:prayer-watch-w3@')
  })

  it('folds long lines and never splits a multi-byte character', () => {
    const ics = buildWatchCalendar({ w6: '09:00' }, { now })
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('“And it shall come to pass')
  })

  it('escapes text per RFC 5545', () => {
    expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne')
    expect(foldLine('x'.repeat(75))).toBe('x'.repeat(75))
    expect(foldLine('x'.repeat(80)).split('\r\n ')).toHaveLength(2)
  })

  it('builds a Google Calendar link that repeats daily', () => {
    const url = new URL(googleCalendarLink(PRAYER_WATCHES[3], '03:15', { now }))
    expect(url.hostname).toBe('calendar.google.com')
    expect(url.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY')
    expect(url.searchParams.get('dates')).toBe('20261119T031500/20261119T033000')
    expect(url.searchParams.get('text')).toContain('Fourth watch')
  })
})
