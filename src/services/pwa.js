// Service Worker Registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user
                  showUpdateNotification()
                }
              })
            }
          })

          // Handle controller change (new SW activated)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload()
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    })
  }
}

function showUpdateNotification() {
  // Create a simple update notification
  const updateToast = document.createElement('div')
  updateToast.className =
    'fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm'
  updateToast.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <div class="font-medium">Update Available</div>
        <div class="text-sm opacity-90">Refresh to get the latest version</div>
      </div>
      <button onclick="window.location.reload()" class="ml-3 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-sm font-medium transition-colors">
        Refresh
      </button>
    </div>
  `
  document.body.appendChild(updateToast)

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (updateToast.parentNode) {
      updateToast.remove()
    }
  }, 10000)
}

// Check if app is running in standalone mode (PWA)
export function isPWA() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

// Request notification permission
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  return false
}

// Check online status
export function isOnline() {
  return navigator.onLine
}

// Listen for online/offline events
export function setupNetworkListeners(callback) {
  window.addEventListener('online', () => callback(true))
  window.addEventListener('offline', () => callback(false))
}
