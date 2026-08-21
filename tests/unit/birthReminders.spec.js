import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  dayKey,
  parseTime,
  occurrenceOn,
  nextOccurrence,
  isDue,
  createDailyReminder,
} from '../../src/services/birthReminders.js'

describe('reminder time maths', () => {
  it('keys a day by local calendar date, not UTC', () => {
    expect(dayKey(new Date(2026, 7, 21, 23, 30))).toBe('2026-08-21')
    expect(dayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('parses a time of day and rejects nonsense', () => {
    expect(parseTime('08:00')).toEqual({ hours: 8, minutes: 0 })
    expect(parseTime('7:05')).toEqual({ hours: 7, minutes: 5 })
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 })
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('08:60')).toBeNull()
    expect(parseTime('')).toBeNull()
    expect(parseTime(null)).toBeNull()
  })

  it('places the occurrence on the same calendar day', () => {
    const at = occurrenceOn(new Date(2026, 7, 21, 19, 0), '08:00')
    expect(at.getFullYear()).toBe(2026)
    expect(at.getDate()).toBe(21)
    expect(at.getHours()).toBe(8)
    expect(at.getMinutes()).toBe(0)
    expect(at.getSeconds()).toBe(0)
  })

  it('rolls to tomorrow once today has passed', () => {
    const before = nextOccurrence('08:00', new Date(2026, 7, 21, 6, 0))
    expect(before.getDate()).toBe(21)

    const after = nextOccurrence('08:00', new Date(2026, 7, 21, 9, 0))
    expect(after.getDate()).toBe(22)
    expect(after.getHours()).toBe(8)
  })

  it('rolls over a month boundary', () => {
    const next = nextOccurrence('08:00', new Date(2026, 7, 31, 20, 0))
    expect(next.getMonth()).toBe(8)
    expect(next.getDate()).toBe(1)
  })
})

describe('isDue', () => {
  it('is not due before the time', () => {
    expect(isDue({ time: '08:00', now: new Date(2026, 7, 21, 7, 59), lastFiredKey: null })).toBe(
      false,
    )
  })

  it('is due once the time has passed and today has not fired', () => {
    expect(isDue({ time: '08:00', now: new Date(2026, 7, 21, 8, 0), lastFiredKey: null })).toBe(true)
  })

  it('catches up a reminder missed earlier the same day', () => {
    // The whole point: the app was closed at 08:00 and opened at 21:00.
    expect(
      isDue({ time: '08:00', now: new Date(2026, 7, 21, 21, 0), lastFiredKey: '2026-08-20' }),
    ).toBe(true)
  })

  it('does not fire twice on the same day', () => {
    expect(
      isDue({ time: '08:00', now: new Date(2026, 7, 21, 21, 0), lastFiredKey: '2026-08-21' }),
    ).toBe(false)
  })

  it('is never due for an unparseable time', () => {
    expect(isDue({ time: 'later', now: new Date(2026, 7, 21, 21, 0), lastFiredKey: null })).toBe(
      false,
    )
  })
})

describe('createDailyReminder', () => {
  let config
  let fired

  function build(overrides = {}) {
    return createDailyReminder({
      getConfig: () => config,
      getPayload: () => ({ title: 'Day 1', body: 'Little one, you are known.' }),
      onFired: (key) => {
        fired.push(key)
        config = { ...config, lastFiredKey: key }
      },
      ...overrides,
    })
  }

  beforeEach(() => {
    fired = []
    config = { enabled: true, time: '08:00', lastFiredKey: null }
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 21, 7, 0))
    // happy-dom has no Notification; the scheduler must still book-keep.
    globalThis.Notification = class {
      static permission = 'granted'
      constructor() {
        this.close = () => {}
      }
    }
    window.Notification = globalThis.Notification
  })

  afterEach(() => {
    vi.useRealTimers()
    delete globalThis.Notification
    delete window.Notification
  })

  it('does nothing before the reminder time', async () => {
    const reminder = build()
    await reminder.start()
    expect(fired).toEqual([])
    reminder.stop()
  })

  it('fires when the time arrives while the app is open', async () => {
    const reminder = build()
    await reminder.start()
    vi.setSystemTime(new Date(2026, 7, 21, 8, 0))
    await reminder.sync()
    expect(fired).toEqual(['2026-08-21'])
    reminder.stop()
  })

  it('delivers a missed reminder on the next sync that day, only once', async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 21, 0))
    const reminder = build()
    await reminder.start()
    expect(fired).toEqual(['2026-08-21'])

    await reminder.sync()
    await reminder.sync()
    expect(fired).toEqual(['2026-08-21'])
    reminder.stop()
  })

  it('fires again the following day', async () => {
    vi.setSystemTime(new Date(2026, 7, 21, 9, 0))
    const reminder = build()
    await reminder.start()
    vi.setSystemTime(new Date(2026, 7, 22, 9, 0))
    await reminder.sync()
    expect(fired).toEqual(['2026-08-21', '2026-08-22'])
    reminder.stop()
  })

  it('stays silent while disabled', async () => {
    config = { ...config, enabled: false }
    vi.setSystemTime(new Date(2026, 7, 21, 21, 0))
    const reminder = build()
    await reminder.start()
    expect(fired).toEqual([])
    reminder.stop()
  })

  it('stamps the day even when the platform refuses to show the notification', async () => {
    // Permission revoked between enabling and firing. Without the stamp the
    // scheduler would retry on every single tick, forever.
    window.Notification.permission = 'denied'
    vi.setSystemTime(new Date(2026, 7, 21, 21, 0))
    const reminder = build()
    await reminder.start()
    expect(fired).toEqual(['2026-08-21'])
    reminder.stop()
  })

  it('stops cleanly and leaves no timer behind', async () => {
    const reminder = build()
    await reminder.start()
    expect(reminder.isRunning).toBe(true)
    reminder.stop()
    expect(reminder.isRunning).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
