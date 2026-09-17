// CJC Racers service worker — displays notifications while the app schedules alarms,
// including on mobile browsers where `new Notification()` is unsupported.

self.addEventListener('install', () => {
  // Activate this worker immediately without waiting for old tabs to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of open clients as soon as the worker activates.
  event.waitUntil(self.clients.claim())
})

// Support for future server-sent Web Push. Harmless when unused.
self.addEventListener('push', (event) => {
  let payload = { title: 'CJC Racers', body: "It's go time!" }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    // non-JSON payload — keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      vibrate: [200, 100, 200],
    }),
  )
})

// Focus (or open) the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data?.url || '/'
      for (const client of clientList) {
        if (client.url === new URL(url, self.location.origin).href && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
