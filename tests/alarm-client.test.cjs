const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const load = require('./load-server.cjs')({})

test('due alarms exclude cancelled, failed, stale and dismissed revisions', () => {
  const { dueAlarms, alarmEventId } = load('lib/alarm-events.ts')
  const alarm = { id: 'a', revision: 2, scheduledAt: 1000, status: 'scheduled' }
  assert.equal(dueAlarms([alarm], 999, new Set()).length, 0)
  assert.equal(dueAlarms([alarm], 1000, new Set()).length, 1)
  assert.equal(dueAlarms([alarm], 301000, new Set()).length, 0)
  assert.equal(dueAlarms([alarm], 1000, new Set([alarmEventId(alarm)])).length, 0)
  assert.equal(dueAlarms([{ ...alarm, status: 'failed' }], 1000, new Set()).length, 0)
  assert.equal(dueAlarms([{ ...alarm, revision: 3 }], 1000, new Set([alarmEventId(alarm)])).length, 1)
})

test('service worker deduplicates page/push alerts, suppresses expiry, retries display failures', async () => {
  const handlers = {}, displayed = [], records = new Map()
  let fail = false
  const context = vm.createContext({ URL, Date, Promise, self: {
    location: { origin: 'https://example.com' }, addEventListener: (name, fn) => handlers[name] = fn,
    registration: { showNotification: async (title, options) => { if (fail) throw Error('blocked'); displayed.push({ title, ...options }) } },
  } })
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../public/sw.js'), 'utf8'), context)
  // Replace only IndexedDB persistence; exercise real event handlers and serialized queue.
  context.records = records
  vm.runInContext('seen = async (id, write = false) => write ? records.set(id, true) : records.get(id)', context)
  const push = payload => { let work; handlers.push({ data: { json: () => payload }, waitUntil: p => work = p }); return work }
  const payload = { eventId: 'a:1:start', expiresAt: Date.now() + 10000, title: 'Harvest', url: 'https://evil.example/' }
  let pageWork
  handlers.message({ data: { type: 'CJC_ALARM', payload }, source: { url: 'https://example.com/' }, ports: [{ postMessage() {} }], waitUntil: p => pageWork = p })
  await Promise.all([pageWork, push(payload)])
  assert.equal(displayed.length, 1)
  assert.equal(displayed[0].data.url, '/')
  await push({ ...payload, eventId: 'expired', expiresAt: Date.now() - 1 })
  assert.equal(displayed.length, 1)
  fail = true
  await assert.rejects(push({ ...payload, eventId: 'retry' }))
  fail = false
  await push({ ...payload, eventId: 'retry' })
  assert.equal(displayed.length, 2)
})

test('ringtone reuses the supplied MP3, loops and exposes playback rejection', async () => {
  const original = global.Audio
  const players = []
  global.Audio = class { constructor(src) { this.src = src; players.push(this) } play() { return this.blocked ? Promise.reject(Error('blocked')) : Promise.resolve() } pause() { this.paused = true } }
  try {
    const audio = load('lib/alarm-audio.ts')
    await audio.previewRingtone()
    audio.stopRingtone()
    await audio.playRingtone()
    assert.equal(players.length, 1)
    assert.equal(players[0].src, '/alarm-ringtone.mp3')
    assert.equal(players[0].loop, true)
    players[0].blocked = true
    await assert.rejects(audio.playRingtone(), /blocked/)
    audio.stopRingtone()
    assert.equal(players[0].currentTime, 0)
  } finally { global.Audio = original }
})
