/* global self */
/*
 * Loaded into the generated service worker via workbox `importScripts`
 * (vite.config.js). A tapped reminder opens the place it points at
 * (`data.url`): an open window is focused and told where to go, otherwise a
 * new one is opened at that address.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin
  )

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === target.origin)
      if (open) {
        open.postMessage({ type: 'bc-open-url', url: target.href })
        return open.focus()
      }
      return self.clients.openWindow(target.href)
    })
  )
})
