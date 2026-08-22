import { ref, computed, readonly } from 'vue'
import { track, flush } from '../services/analytics.js'

/**
 * The app's update state, kept deliberately free of any service-worker import.
 *
 * `registerServiceWorker.js` owns the actual worker and pushes its callbacks in
 * here through `bindUpdateHandlers`; components only ever see plain refs. That
 * split is what lets the UI be unit-tested without a service worker, and what
 * keeps a browser without service-worker support from breaking the settings
 * screen — there, "check for updates" simply reloads.
 */

const BUILD_STAMP = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : ''
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

const updateReady = ref(false)
const checking = ref(false)
const lastCheckedAt = ref(null)
const note = ref('')
const supported = ref(false)

let checkHandler = null
let applyHandler = null

/** Called once by the service-worker registration, if there is one. */
export function bindUpdateHandlers({ check, apply }) {
  checkHandler = check
  applyHandler = apply
  supported.value = true
}

/** Test seam: drops the handlers so each case starts from a cold app. */
export function clearUpdateHandlers() {
  checkHandler = null
  applyHandler = null
  supported.value = false
  updateReady.value = false
  note.value = ''
  lastCheckedAt.value = null
}

/** Called by the registration when the worker reports a waiting version. */
export function markUpdateReady(ready = true) {
  updateReady.value = ready
  if (ready) note.value = ''
}

export function useAppUpdate() {
  /**
   * Asks the worker to re-fetch its script. A fresh worker means the update
   * banner appears; an unchanged one means we say so, because silence after
   * tapping "check" reads as a broken button.
   */
  async function checkForUpdate() {
    if (checking.value) return
    checking.value = true
    note.value = ''
    try {
      if (checkHandler) {
        await checkHandler()
        // The worker reports a new version asynchronously, so give it a
        // moment before concluding that there was nothing to find.
        await new Promise((resolve) => setTimeout(resolve, 1200))
        note.value = updateReady.value ? '' : 'You are on the latest version.'
      } else {
        // No service worker (a browser without support, or the dev server):
        // a plain reload is the honest equivalent.
        window.location.reload()
      }
      lastCheckedAt.value = new Date()
    } catch {
      note.value = 'Could not check just now. Try again when you are online.'
    } finally {
      checking.value = false
    }
  }

  /**
   * Swaps in the waiting version. The worker takes over and reloads the page,
   * so nothing after this call is guaranteed to run.
   */
  async function installUpdate() {
    track('update_installed')
    // The page is about to be replaced, so send now rather than queueing.
    await flush()
    if (applyHandler) {
      await applyHandler()
      return
    }
    window.location.reload()
  }

  const buildLabel = computed(() => {
    if (!BUILD_STAMP) return APP_VERSION ? `Version ${APP_VERSION}` : ''
    const built = new Date(BUILD_STAMP)
    if (Number.isNaN(built.getTime())) return APP_VERSION ? `Version ${APP_VERSION}` : ''
    const when = built.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return APP_VERSION ? `Version ${APP_VERSION} · ${when}` : `Updated ${when}`
  })

  return {
    updateReady: readonly(updateReady),
    checking: readonly(checking),
    lastCheckedAt: readonly(lastCheckedAt),
    note: readonly(note),
    supported: readonly(supported),
    buildLabel,
    checkForUpdate,
    installUpdate
  }
}
