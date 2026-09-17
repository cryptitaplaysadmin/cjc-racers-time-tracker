/* Push and active-page alerts share a serialized display/deduplication handler. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil((async () => {
  await new Promise(resolve => {
    const request = indexedDB.deleteDatabase('cjc-push-events')
    request.onsuccess = request.onerror = request.onblocked = () => resolve()
  })
  await self.clients.claim()
})()))
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cjc-push-events-fresh-20260918', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('seen')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function seen(id, write = false) {
  const db = await database()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('seen', write ? 'readwrite' : 'readonly')
      const store = tx.objectStore('seen')
      const request = write ? store.put(Date.now(), id) : store.get(id)
      let result
      request.onsuccess = () => { result = request.result }
      tx.oncomplete = () => resolve(result)
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}
function sameOriginPath(value) {
  try { const url = new URL(value || '/', self.location.origin); return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/' } catch { return '/' }
}
let queue = Promise.resolve()
function display(payload) {
  const work = queue.catch(() => {}).then(async () => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid notification.')
    const data = payload.data || {}
    const id = typeof payload.eventId === 'string' ? payload.eventId : typeof payload.tag === 'string' ? payload.tag : ''
    const expiresAt = Number(payload.expiresAt ?? data.expiresAt ?? 0)
    if (expiresAt && expiresAt <= Date.now()) return
    if (id) { try { if (await seen(id)) return } catch { /* Native tag remains a fallback. */ } }
    const url = sameOriginPath(payload.url ?? data.url)
    await self.registration.showNotification(typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'CJC Racers', {
      body: typeof payload.body === 'string' ? payload.body.slice(0, 400) : 'Your timer is done.', tag: id, icon: '/apple-icon.png', data: { ...data, url, eventId: id }, renotify: false, vibrate: [200, 100, 200],
    })
    // Failed notification displays must remain retryable.
    if (id) { try { await seen(id, true) } catch {} }
  })
  queue = work
  return work
}
self.addEventListener('push', event => {
  let payload
  try { payload = event.data ? event.data.json() : {} } catch { payload = {} }
  event.waitUntil(display(payload))
})
self.addEventListener('message', event => {
  if (event.data?.type !== 'CJC_ALARM' || !event.source?.url) return
  if (new URL(event.source.url).origin !== self.location.origin) return
  event.waitUntil(display(event.data.payload).then(
    () => event.ports[0]?.postMessage({ ok: true }),
    () => event.ports[0]?.postMessage({ error: 'Browser notification could not be displayed. Check notification permissions.' }),
  ))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const path = sameOriginPath(event.notification.data?.url)
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const target = new URL(path, self.location.origin).href
    for (const client of clients) if (client.url === target && 'focus' in client) return client.focus()
    return self.clients.openWindow ? self.clients.openWindow(path) : undefined
  }))
})
