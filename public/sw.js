/**
 * Service Worker for Push Notifications and Asset Caching
 * Note: vite-plugin-pwa generates the main service worker with Workbox
 * This file handles additional push notification functionality
 */

const CACHE_VERSION = 'v1.0.0'
const ASSET_CACHE_NAME = `mars-nexus-assets-${CACHE_VERSION}`
const STATIC_CACHE_NAME = `mars-nexus-static-${CACHE_VERSION}`

// Cache versioning for cache busting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version', CACHE_VERSION)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version', CACHE_VERSION)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old caches that don't match current version
            return name.startsWith('mars-nexus-') && 
                   name !== ASSET_CACHE_NAME && 
                   name !== STATIC_CACHE_NAME
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'MARS://NEXUS'
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: data.url || '/',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    ...data.options
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/')
      }
    })
  )
})

// Offline fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return
  
  // Let vite-plugin-pwa's Workbox handle most requests
  // This is a fallback for offline support
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response
      }
      
      // Try network, fallback to offline page for navigation requests
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html')
        }
      })
    })
  )
})
