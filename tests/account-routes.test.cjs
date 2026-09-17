const test = require('node:test')
const assert = require('node:assert/strict')
const { NextRequest } = require('next/server')
const loader = require('./load-server.cjs')

function fixture() {
  const groups = new Map()
  const alarms = new Map()
  const disabled = []
  let cookie = ''
  let loseNextWrite = false
  const store = {
    group: async id => structuredClone(groups.get(id) ?? null),
    groupByCode: async code => structuredClone([...groups.values()].find(g => g.code === code) ?? null),
    createGroup: async g => { if ([...groups.values()].some(x => x.code === g.code)) return false; groups.set(g.id, structuredClone(g)); return true },
    compareAndSetGroup: async (before, after) => {
      if (loseNextWrite) { loseNextWrite = false; groups.set(before.id, { ...groups.get(before.id), revision: before.revision + 1 }); return false }
      if (groups.get(before.id)?.revision !== before.revision) return false
      groups.set(before.id, structuredClone(after)); return true
    },
    alarms: async id => structuredClone([...alarms.values()].filter(a => a.groupId === id)),
    alarm: async id => structuredClone(alarms.get(id) ?? null),
    saveAlarm: async alarm => alarms.set(alarm.id, structuredClone(alarm)),
    disableSubscription: async (groupId, deviceId) => disabled.push({ groupId, deviceId }),
  }
  const load = loader({
    'lib/server/store.ts': { store },
    'lib/server/config.ts': { getConfig: () => ({ SESSION_SECRET: 'test-only-secret', APP_ENV: 'test' }), publicReadiness: () => ({ ready: true, missing: [] }) },
    'lib/server/scheduler.ts': { scheduleAlarm: async () => {} },
    'next/headers': { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
  })
  return { load, groups, alarms, disabled, setCookie: value => { cookie = value }, loseWrite: () => { loseNextWrite = true } }
}
const request = (route, body, origin = 'https://test.example', method = 'POST') => new NextRequest(`https://test.example${route}`, { method, headers: { origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
const cookieFrom = response => response.cookies.get('cjc_session')?.value

test('create and join persist distinct account/player identities without configured group passwords', async () => {
  const f = fixture(); const route = f.load('app/api/session/route.ts')
  const created = await route.POST(request('/api/session', { action: 'create', accountName: 'GameAccount', name: 'Alice' }))
  assert.ok(created.ok, await created.clone().text())
  const a = await created.json()
  assert.equal(a.group.accountName, 'GameAccount'); assert.equal(a.session.name, 'Alice'); assert.equal(a.group.playing, null)
  f.setCookie(cookieFrom(created))
  const reload = await route.GET(); assert.equal((await reload.json()).group.id, a.group.id)
  f.setCookie('')
  const joined = await route.POST(request('/api/session', { action: 'join', joinCode: a.group.code.toLowerCase(), name: 'Bob' }))
  assert.ok(joined.ok, await joined.clone().text())
  const b = await joined.json()
  assert.equal(b.group.id, a.group.id); assert.equal(b.session.name, 'Bob'); assert.notEqual(b.session.deviceId, a.session.deviceId)
})

test('foreign origins and unknown group codes cannot create or join', async () => {
  const f = fixture(); const route = f.load('app/api/session/route.ts')
  assert.equal((await route.POST(request('/api/session', { action: 'create', accountName: 'Game', name: 'X' }, 'https://evil.example'))).ok, false)
  assert.equal(f.groups.size, 0)
  assert.equal((await route.POST(request('/api/session', { action: 'join', joinCode: 'A'.repeat(24), name: 'X' }))).ok, false)
})

test('timers remain within their group and creating an alarm never claims playing status', async () => {
  const f = fixture(); const session = f.load('app/api/session/route.ts'); const route = f.load('app/api/alarms/route.ts')
  const first = await session.POST(request('/api/session', { action: 'create', accountName: 'First', name: 'Alice' }))
  const firstBody = await first.json(); f.setCookie(cookieFrom(first))
  const alarm = await route.POST(request('/api/alarms', { activity: 'champion_stake', label: 'Cup', scheduledAt: Date.now() + 180000, timezone: 'UTC' }))
  assert.ok(alarm.ok, await alarm.clone().text())
  assert.equal(f.groups.get(firstBody.group.id).playing, null)
  const second = await session.POST(request('/api/session', { action: 'create', accountName: 'Second', name: 'Bob' }))
  f.setCookie(cookieFrom(second))
  const otherList = await route.GET(); assert.deepEqual((await otherList.json()).alarms, [])
  f.setCookie(cookieFrom(first))
  assert.equal((await (await route.GET()).json()).alarms.length, 1)
})

test('playing route rejects losing atomic writes and stale takeovers', async () => {
  const f = fixture(); const session = f.load('app/api/session/route.ts'); const playing = f.load('app/api/group/playing/route.ts')
  const created = await session.POST(request('/api/session', { action: 'create', accountName: 'Game', name: 'Alice' })); const data = await created.json()
  f.setCookie(cookieFrom(created)); f.loseWrite()
  const conflict = await playing.POST(request('/api/group/playing', { action: 'start', revision: data.group.revision }))
  assert.equal(conflict.status, 409)
  const group = f.groups.get(data.group.id)
  const started = await playing.POST(request('/api/group/playing', { action: 'start', revision: group.revision }))
  assert.ok(started.ok, await started.clone().text())
  const current = f.groups.get(data.group.id)
  const joined = await session.POST(request('/api/session', { action: 'join', joinCode: data.group.code, name: 'Bob' })); f.setCookie(cookieFrom(joined))
  assert.equal((await playing.POST(request('/api/group/playing', { action: 'stop', revision: current.revision }))).ok, false)
  assert.equal((await playing.POST(request('/api/group/playing', { action: 'takeover', revision: data.group.revision }))).status, 409)
  assert.ok((await playing.POST(request('/api/group/playing', { action: 'takeover', revision: current.revision }))).ok)
  assert.equal(f.groups.get(data.group.id).playing.name, 'Bob')
})

test('leaving clears session and disables subscription without clearing manual playing status', async () => {
  const f = fixture(); const session = f.load('app/api/session/route.ts'); const playing = f.load('app/api/group/playing/route.ts')
  const created = await session.POST(request('/api/session', { action: 'create', accountName: 'Game', name: 'Alice' })); const data = await created.json()
  f.setCookie(cookieFrom(created)); await playing.POST(request('/api/group/playing', { action: 'start', revision: data.group.revision }))
  const left = await session.DELETE(request('/api/session', undefined, 'https://test.example', 'DELETE'))
  assert.ok(left.ok, await left.clone().text()); assert.equal(cookieFrom(left), '')
  assert.ok(f.disabled.some(s => s.groupId === data.group.id && s.deviceId === data.session.deviceId))
  assert.equal(f.groups.get(data.group.id).playing.name, 'Alice')
})
