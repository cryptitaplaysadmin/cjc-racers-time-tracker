const test = require('node:test')
const assert = require('node:assert/strict')
const loader = require('./load-server.cjs')

test('schedule reads batch Redis GETs and avoid MGET for an empty group', async () => {
  const original = global.fetch, commands = []
  let ids = ['a', 'b']
  global.fetch = async (_, options) => {
    const command = JSON.parse(options.body); commands.push(command)
    const result = command[0] === 'ZRANGE' ? ids : command[0] === 'MGET' ? [JSON.stringify({ id: 'a', groupId: 'g', scheduledAt: 1 }), null] : 0
    return new Response(JSON.stringify({ result }))
  }
  try {
    const { store } = loader({ 'lib/server/config.ts': { getConfig: () => ({ APP_ENV: 'test', UPSTASH_REDIS_REST_URL: 'https://store.invalid', UPSTASH_REDIS_REST_TOKEN: 'test' }) } })('lib/server/store.ts')
    assert.equal((await store.alarms('g')).length, 1)
    assert.deepEqual(commands.map(c => c[0]), ['ZREMRANGEBYSCORE', 'ZRANGE', 'MGET'])
    ids = []; commands.length = 0
    assert.deepEqual(await store.alarms('g'), [])
    assert.ok(!commands.some(c => c[0] === 'MGET'))
  } finally { global.fetch = original }
})

test('each notification test uses a new tag so the worker does not suppress it', async () => {
  const bodies = []
  const route = loader({
    'lib/server/http.ts': { requireSameOrigin() {}, requireSession: async () => ({ groupId: 'g', deviceId: 'd' }), apiError: error => { throw error } },
    'lib/server/store.ts': { store: { subscriptions: async () => [{ deviceId: 'd' }] } },
    'lib/server/push.ts': { sendPush: async (_, body) => bodies.push(JSON.parse(body)) },
  })('app/api/push/test/route.ts')
  assert.equal((await route.POST({})).status, 200)
  assert.equal((await route.POST({})).status, 200)
  assert.notEqual(bodies[0].tag, bodies[1].tag)
})
