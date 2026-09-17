/* CJC Racers background push handler. Do not cache authenticated API data here. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

const DB_NAME = 'cjc-push-events'
const STORE = 'seen'
function database() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) }) }
async function alreadySeen(id) {
  if (!id) return false
  const db = await database()
  const seen = await new Promise((resolve, reject) => { const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
  if (seen) return true
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(Date.now(), id); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
  return false
}
function sameOriginPath(value) { try { const url = new URL(value || '/', self.location.origin); return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/' } catch { return '/' } }

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch {}
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'CJC Racers'
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 400) : "It's go time!"
  const eventId = typeof payload.eventId === 'string' ? payload.eventId : (typeof payload.tag === 'string' ? payload.tag : '')
  const expiresAt = Number(payload.expiresAt ?? 0)
  event.waitUntil((async () => {
    if (expiresAt && expiresAt < Date.now()) return
    try { if (await alreadySeen(eventId)) return } catch { /* Avoid losing an alert if IndexedDB is unavailable. */ }
    await self.registration.showNotification(title, { body, tag: typeof payload.tag === 'string' ? payload.tag : eventId, data: { url: sameOriginPath(payload.url), eventId }, renotify: false, vibrate: [200, 100, 200] })
  })())
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const path = sameOriginPath(event.notification.data && event.notification.data.url)
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const target = new URL(path, self.location.origin).href
    for (const client of clients) if (client.url === target && 'focus' in client) return client.focus()
    return self.clients.openWindow ? self.clients.openWindow(path) : undefined
  }))
})
