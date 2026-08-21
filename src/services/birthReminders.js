/**
 * Daily reminder for the birth calendar.
 *
 * There is no push server behind this app, so a reminder can only be delivered
 * by code that is actually running: an open tab, or the installed PWA in the
 * background before the OS suspends it. That is a real limitation and the
 * Settings screen says so rather than implying a guarantee we cannot keep.
 *
 * What we CAN do well is never miss the reminder once the app is opened. Every
 * fired reminder is stamped with its local day key, so opening the app at 9pm
 * on a day whose 08:00 reminder never ran still delivers it — once — instead of
 * silently dropping the day.
 *
 * The scheduling maths is pure and separately tested; the class below only
 * handles timers, permission and the notification itself.
 */

/** Local calendar day, not UTC — a reminder belongs to the user's day. */
export function dayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "08:00" -> { hours: 8, minutes: 0 }. Null for anything unparseable. */
export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}

/** The moment `time` falls on the calendar day of `date`. */
export function occurrenceOn(date, time) {
  const parsed = parseTime(time)
  if (!parsed) return null
  const at = new Date(date)
  at.setHours(parsed.hours, parsed.minutes, 0, 0)
  return at
}

/** The next moment `time` comes around, strictly after `from`. */
export function nextOccurrence(time, from = new Date()) {
  const today = occurrenceOn(from, time)
  if (!today) return null
  if (today > from) return today
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow
}

/**
 * True when today's reminder is owed: the time has passed and this day has not
 * been delivered yet. This is what makes a missed reminder catch up on open.
 */
export function isDue({ time, now = new Date(), lastFiredKey = null }) {
  const at = occurrenceOn(now, time)
  if (!at) return false
  if (now < at) return false
  return lastFiredKey !== dayKey(now)
}

/** Browsers throttle very long timers, so re-arm instead of trusting one. */
export const MAX_TIMEOUT_MS = 6 * 60 * 60 * 1000

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return window.Notification.permission
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  if (window.Notification.permission !== 'default') return window.Notification.permission
  try {
    return await window.Notification.requestPermission()
  } catch {
    return window.Notification.permission
  }
}

/**
 * Owns the timer. `getConfig` is read fresh on every tick rather than captured,
 * so changing the time in Settings takes effect without tearing the scheduler
 * down and building a new one.
 *
 * @param {() => ({enabled: boolean, time: string, lastFiredKey: string|null})} getConfig
 * @param {(key: string) => Promise<void>|void} onFired  persists the day key
 * @param {() => ({title: string, body: string, tag?: string})|null} getPayload
 */
export function createDailyReminder({ getConfig, onFired, getPayload, now = () => new Date() }) {
  let timer = null
  let running = false

  function clear() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  function deliver() {
    const payload = getPayload?.()
    if (!payload) return false
    if (notificationPermission() !== 'granted') return false
    try {
      const notification = new window.Notification(payload.title, {
        body: payload.body,
        tag: payload.tag || 'birth-daily-reminder',
        icon: '/icon-192x192.svg',
        badge: '/icon-192x192.svg'
      })
      notification.onclick = () => {
        window.focus?.()
        notification.close()
      }
      return true
    } catch {
      // Some platforms (notably iOS Safari outside an installed PWA) expose the
      // constructor but throw on use. Nothing to recover from — just don't crash.
      return false
    }
  }

  /**
   * Fires anything owed, then arms the timer for the next occurrence. Safe to
   * call as often as you like: the day key stops a second delivery.
   */
  async function tick() {
    clear()
    if (!running) return
    const config = getConfig()
    if (!config?.enabled) return

    const current = now()
    if (isDue({ time: config.time, now: current, lastFiredKey: config.lastFiredKey })) {
      deliver()
      // Stamp the day even when delivery failed (permission revoked, platform
      // refused). Retrying every tick would achieve nothing but noise.
      await onFired?.(dayKey(current))
    }

    const next = nextOccurrence(config.time, now())
    if (!next) return
    timer = setTimeout(tick, Math.min(MAX_TIMEOUT_MS, Math.max(1000, next - now())))
  }

  return {
    start() {
      running = true
      return tick()
    },
    stop() {
      running = false
      clear()
    },
    /** Call after a settings change, and when the tab becomes visible again. */
    sync() {
      if (!running) return Promise.resolve()
      return tick()
    },
    get isRunning() {
      return running
    }
  }
}
