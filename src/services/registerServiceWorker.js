import { registerSW } from 'virtual:pwa-register'
import { bindUpdateHandlers, markUpdateReady } from '../composables/useAppUpdate.js'

// How often a long-lived tab asks whether a new build has shipped. An installed
// PWA can stay open for days, which is exactly the case where the old build
// used to linger until someone thought to hard-refresh.
const CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registers the service worker and wires it to the in-app update controls.
 *
 * The worker no longer reloads the page out from under the user (`registerType`
 * is 'prompt'): a new version surfaces as a banner and as the "Check for
 * updates" row in settings, and the reload happens when they ask for it.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      markUpdateReady(true)
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      bindUpdateHandlers({
        check: () => registration.update(),
        apply: async () => {
          await updateSW(true)
          // The waiting worker normally takes control and the page reloads on
          // its own. Where there was nothing waiting — a worker that already
          // activated because no page was under its control — reload anyway,
          // so the button is never a no-op.
          setTimeout(() => window.location.reload(), 1500)
        }
      })

      // A worker that is already waiting when we register — the usual case
      // when the user last closed the app mid-update — has no onNeedRefresh.
      if (registration.waiting) markUpdateReady(true)

      setInterval(() => {
        if (navigator.onLine !== false) registration.update()
      }, CHECK_INTERVAL_MS)

      // Coming back to a backgrounded PWA is the moment an update matters
      // most, and it costs one conditional request.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
      window.addEventListener('online', () => registration.update())
    }
  })
}
