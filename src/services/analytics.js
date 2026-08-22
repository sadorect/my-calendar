/**
 * Opt-in, anonymous usage counters.
 *
 * The rules this file exists to enforce:
 *
 *   - Nothing is sent unless the user has turned it on. Off is the default, and
 *     off means the queue is dropped, not held.
 *   - Only names from a fixed list travel. No free text, no journal, no name,
 *     no due date — nothing that describes a person or their pregnancy.
 *   - The identifier is a random token this device made up for itself, stored
 *     locally and thrown away the moment the toggle goes off. It is not the
 *     account, and there is no way back from it to an email address.
 *
 * Events are batched: a pregnancy app is opened for a minute at a time, and one
 * request on the way out is kinder to a phone's battery than fifteen.
 */
import { getSetting, setSetting } from './database.js'
import { SYNC_URL, isSyncConfigured } from './syncClient.js'

const INSTALL_KEY = 'usageInstallId'
const FLUSH_DELAY = 8000
const MAX_QUEUE = 50

/** Must match USAGE_EVENTS on the server; anything else is dropped there. */
export const EVENTS = [
  'app_open',
  'birth_open',
  'onboarding_complete',
  'view_today',
  'view_month',
  'view_weeks',
  'view_saved',
  'view_settings',
  'reminders_enabled',
  'keepsake_made',
  'declaration_shared',
  'sync_registered',
  'sync_signed_in',
  'update_installed'
]

let enabled = false
let installId = null
let queue = []
let timer = null

export function analyticsAvailable() {
  return isSyncConfigured()
}

/**
 * Turns collection on or off. Called from settings and once at startup with
 * whatever the user chose last time.
 */
export async function setAnalyticsEnabled(value) {
  enabled = Boolean(value) && analyticsAvailable()
  if (!enabled) {
    // Forget the identifier as well as the queue: leaving it behind would mean
    // turning the toggle back on re-joins a device to its own history, which is
    // not what "off" should have meant.
    queue = []
    clearTimeout(timer)
    installId = null
    await setSetting(INSTALL_KEY, null)
    return
  }
  installId = await ensureInstallId()
}

async function ensureInstallId() {
  const saved = await getSetting(INSTALL_KEY)
  if (typeof saved === 'string' && saved) return saved
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const value = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  await setSetting(INSTALL_KEY, value)
  return value
}

/** Records one event. A no-op when analytics are off, which is the default. */
export function track(name) {
  if (!enabled || !EVENTS.includes(name)) return
  if (queue.length >= MAX_QUEUE) return
  queue.push({ name, occurredAt: new Date().toISOString() })
  clearTimeout(timer)
  timer = setTimeout(flush, FLUSH_DELAY)
}

/**
 * Sends whatever is queued. `keepalive` so a flush started as the app closes
 * still goes; a failure drops the batch rather than retrying, because counters
 * are not worth a queue that outlives the session.
 */
export async function flush() {
  clearTimeout(timer)
  if (!enabled || !installId || !queue.length) return
  const events = queue
  queue = []
  try {
    await fetch(`${SYNC_URL}/v1/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId, events }),
      keepalive: true
    })
  } catch {
    // Offline, blocked, or the server is down. Nothing here is worth surfacing
    // to somebody reading a daily declaration.
  }
}

/**
 * Called once at startup. Reads the saved choice, and only then does anything
 * at all — an install that has never opted in never even gets an identifier.
 */
export async function startAnalytics() {
  if (!analyticsAvailable()) return
  try {
    const saved = await getSetting('birthCalendar')
    if (!saved?.settings?.usageAnalytics) return
    await setAnalyticsEnabled(true)
    track('app_open')
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        // The only reliable moment to send on mobile: a phone rarely fires
        // anything on the way out except this.
        if (document.visibilityState === 'hidden') flush()
      })
    }
  } catch {
    // A storage failure must never stop the app from starting.
  }
}
