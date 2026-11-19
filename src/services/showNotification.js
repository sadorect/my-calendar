/**
 * Shows a notification the way every platform accepts.
 *
 * `new Notification()` is refused outright by Chrome on Android — including
 * the Android app, which is Chrome underneath — with "Illegal constructor. Use
 * ServiceWorkerRegistration.showNotification() instead". The error was being
 * swallowed, so on Android the daily reminder silently never appeared. Going
 * through the service worker works everywhere a worker is registered; the
 * constructor stays as the fallback for a page without one (dev server, or a
 * browser that blocked the worker).
 *
 * `url` is where a tap should take the user. The worker's click handler
 * (public/sw-notifications.js) reads it from `data.url`.
 */
const ICON = '/icon-192x192.png'

async function workerRegistration() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.getRegistration) return null
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.showNotification && registration.active ? registration : null
  } catch {
    return null
  }
}

/** @returns {Promise<boolean>} whether a notification was shown */
export async function showAppNotification({ title, body, tag, url = '/' }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (window.Notification.permission !== 'granted') return false

  const options = { body, tag, icon: ICON, badge: ICON, data: { url } }

  const registration = await workerRegistration()
  if (registration) {
    try {
      await registration.showNotification(title, options)
      return true
    } catch {
      // Fall through to the constructor.
    }
  }

  try {
    const notification = new window.Notification(title, options)
    notification.onclick = () => {
      window.focus?.()
      notification.close()
      if (url && url !== '/')
        window.dispatchEvent(new window.CustomEvent('bc-open-url', { detail: url }))
    }
    return true
  } catch {
    // iOS Safari outside an installed app exposes the constructor but throws.
    return false
  }
}
