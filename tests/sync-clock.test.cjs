const test = require('node:test')
const assert = require('node:assert/strict')
const { serverClock } = require('./load-server.cjs')({})('lib/sync-clock.ts')
test('devices with independent clock origins show equal remaining time', () => {
  const first = serverClock(100000, 500), second = serverClock(100000, 900000)
  assert.equal(first(2500), second(902000))
  assert.equal(110000 - first(2500), 8000)
})
