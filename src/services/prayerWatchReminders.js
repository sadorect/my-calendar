/**
 * Reminders for the prayer watches the user has switched on.
 *
 * Same delivery limits as the daily reminder (see birthReminders.js): with no
 * push server, a reminder only fires while the app is running. The difference
 * is the catch-up rule. A missed daily reminder is still worth showing later
 * that day; a missed watch is not — a midnight reminder arriving at breakfast
 * is noise. So an owed reminder is delivered only while its watch is still
 * open, and silently dropped once the watch has closed.
 *
 * Which occurrence fired is remembered per device in localStorage, not in the
 * synced blob: each device rings for itself, like an alarm, and the state
 * schema stays untouched.
 */
import { dayKey, nextOccurrence, occurrenceOn, MAX_TIMEOUT_MS } from './birthReminders.js'
import { showAppNotification } from './showNotification.js'
import {
  PRAYER_WATCHES,
  WATCH_LENGTH_HOURS,
  cleanWatchSelection,
  watchWindowLabel
} from '../data/prayerWatches.js'

export const FIRED_STORAGE_KEY = 'bc-prayer-watch-fired'

/** The most recent moment `time` came round, at or before `now`. */
export function lastOccurrence(time, now = new Date()) {
  const today = occurrenceOn(now, time)
  if (!today) return null
  if (today <= now) return today
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday
}

/** When the watch containing `occurrence` closes. */
export function watchEnd(watch, occurrence) {
  const end = new Date(occurrence)
  end.setHours(watch.start + WATCH_LENGTH_HOURS, 0, 0, 0)
  return end
}

/**
 * The watches owed a reminder right now: their time has come round, their
 * watch has not closed, and this occurrence has not been delivered.
 * Returns `[{ watch, key }]` where `key` stamps the occurrence.
 */
export function dueWatches({ selection, now = new Date(), fired = {} }) {
  const out = []
  const chosen = cleanWatchSelection(selection)
  for (const watch of PRAYER_WATCHES) {
    const time = chosen[watch.id]
    if (!time) continue
    const at = lastOccurrence(time, now)
    if (!at || now >= watchEnd(watch, at)) continue
    // Day AND time: moving a reminder later inside an open watch is a new
    // occurrence. Keyed on the day alone, switching a watch on mid-watch (which
    // stamps the current occurrence) silenced any later time chosen that day.
    const key = `${dayKey(at)} ${time}`
    if (fired[watch.id] === key) continue
    out.push({ watch, key })
  }
  return out
}

/** The next moment any selected watch is due, or null when none are on. */
export function nextWatchAt(selection, from = new Date()) {
  let soonest = null
  for (const time of Object.values(cleanWatchSelection(selection))) {
    const at = nextOccurrence(time, from)
    if (at && (!soonest || at < soonest)) soonest = at
  }
  return soonest
}

/** What the notification says for a watch. */
export function watchPayload(watch) {
  return {
    title: `${watch.name} · ${watchWindowLabel(watch)}`,
    body: `${watch.focus}. “${shorten(watch.verse.text, 110)}” — ${watch.verse.ref}`,
    tag: `prayer-watch-${watch.id}`,
    url: `/?calendar=birth&watch=${watch.id}`
  }
}

function shorten(text, max) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…'
}

export function loadFired(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(FIRED_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function saveFired(fired, storage = globalThis.localStorage) {
  try {
    storage?.setItem(FIRED_STORAGE_KEY, JSON.stringify(fired))
  } catch {
    // Private mode or a full quota: at worst a reminder repeats once.
  }
}

/**
 * Owns the timer. `getSelection` is read fresh on every tick, so a change in
 * Settings takes effect on the next `sync()` without rebuilding anything.
 */
export function createWatchReminders({
  getSelection,
  deliver = (watch) => showAppNotification(watchPayload(watch)),
  storage = globalThis.localStorage,
  now = () => new Date()
}) {
  let timer = null
  let running = false

  function clear() {
    if (timer) clearTimeout(timer)
    timer = null
  }

  async function tick() {
    clear()
    if (!running) return
    const selection = getSelection() || {}

    const fired = loadFired(storage)
    const due = dueWatches({ selection, now: now(), fired })
    for (const { watch, key } of due) {
      // Stamp first, even if delivery fails: retrying every tick for the rest
      // of the watch would only be noise.
      fired[watch.id] = key
      saveFired(fired, storage)
      await deliver(watch)
    }

    const next = nextWatchAt(selection, now())
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
    sync() {
      if (!running) return Promise.resolve()
      return tick()
    },
    get isRunning() {
      return running
    }
  }
}

/**
 * Switching a watch on in the middle of it should not ring straight away —
 * the user is plainly awake and looking at the app. Stamps the current
 * occurrence as delivered if it is already owed.
 */
export function skipCurrentOccurrence(
  watchId,
  time,
  now = new Date(),
  storage = globalThis.localStorage
) {
  const due = dueWatches({ selection: { [watchId]: time }, now, fired: {} })
  if (!due.length) return
  const fired = loadFired(storage)
  fired[watchId] = due[0].key
  saveFired(fired, storage)
}
