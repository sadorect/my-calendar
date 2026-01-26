// Service Worker for Personal Calendar PWA
const CACHE_NAME = 'personal-calendar-v1.0.0'
const STATIC_CACHE = 'personal-calendar-static-v1.0.0'
const DYNAMIC_CACHE = 'personal-calendar-dynamic-v1.0.0'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
  // Add other static assets as needed
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing')
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .catch((error) => {
        console.error('[Service Worker] Failed to cache static assets:', error)
      })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip external requests
  if (!url.origin.includes(self.location.origin)) return

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseClone))
          }
          return response
        })
        .catch(() => {
          // Return cached API response if available
          return caches.match(request)
        })
    )
    return
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Cache the response
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseClone))

          return response
        })
        .catch(() => {
          // Return offline fallback for navigation requests
          if (request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag)

  if (event.tag === 'background-sync-events') {
    event.waitUntil(syncPendingEvents())
  }
})

// Function to sync pending events when back online
async function syncPendingEvents() {
  try {
    // Get pending events from IndexedDB or local storage
    const pendingEvents = await getPendingEvents()

    for (const event of pendingEvents) {
      try {
        // Attempt to sync each event
        await syncEvent(event)
        // Remove from pending if successful
        await removePendingEvent(event.id)
      } catch (error) {
        console.error('[Service Worker] Failed to sync event:', event.id, error)
      }
    }
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error)
  }
}

// Placeholder functions - implement based on your data storage
async function getPendingEvents() {
  // Return pending events from IndexedDB
  return []
}

async function syncEvent(event) {
  // Sync event with server
  return Promise.resolve()
}

async function removePendingEvent(eventId) {
  // Remove event from pending queue
  return Promise.resolve()
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event)

  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Event'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    }

    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event)

  event.notification.close()

  if (event.action === 'view') {
    // Open the app and navigate to the event
    event.waitUntil(clients.openWindow('/'))
  }
})
