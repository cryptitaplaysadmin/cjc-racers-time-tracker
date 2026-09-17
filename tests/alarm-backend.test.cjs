const test = require('node:test')
const assert = require('node:assert/strict')
const load = require('./load-server.cjs')({})
const { cleanAlarm } = load('lib/server/validation.ts')
const { ApiError, errorStatus } = load('lib/server/errors.ts')
const { dispatchDecision } = load('lib/server/dispatch.ts')

test('all crop deadlines use server planting time and ignore client deadlines', () => {
  const hours = { carrots: 8, wheat: 8, grape: 4, corn: 4, sugar_cane: 4, apple: 4, pineapple: 4, melon: 2, kiwi: 2, strawberry: 2, blueberry: 2 }
  const now = 1_800_123_456_789
  for (const [cropId, duration] of Object.entries(hours)) {
    const alarm = cleanAlarm({ activity: 'farming', cropId, scheduledAt: 1, durationMs: 1 }, now)
    assert.equal(alarm.scheduledAt, now + duration * 3_600_000)
    assert.equal(alarm.cropId, cropId)
    assert.equal(alarm.activity, 'farming')
    assert.match(alarm.label, /harvest$/)
  }
  assert.equal(cleanAlarm({ activity: 'farming', cropId: 'wheat', label: '  North field  ' }, now).label, 'North field')
})

test('invalid crops and invalid race dates produce validation errors', () => {
  const now = 100_000
  for (const cropId of ['', null, {}, 'tomato', 'WHEAT']) {
    assert.throws(() => cleanAlarm({ activity: 'farming', cropId }, now), error => errorStatus(error) === 400)
  }
  for (const scheduledAt of [NaN, 0, now, now + 86_400_001]) {
    assert.throws(() => cleanAlarm({ activity: 'champion_stake', label: 'Sprint', scheduledAt }, now), error => errorStatus(error) === 400)
  }
  assert.equal(cleanAlarm({ activity: 'grand_master_cup', label: 'Long', scheduledAt: now + 1 }, now).scheduledAt, now + 1)
  assert.throws(() => cleanAlarm(null, now), error => errorStatus(error) === 400)
})

test('authentication, validation and dependency failures remain distinct', () => {
  assert.equal(errorStatus(new ApiError('Session expired', 401)), 401)
  assert.equal(errorStatus(new ApiError('Bad input', 400)), 400)
  assert.equal(errorStatus(new ApiError('Wrong origin', 403)), 403)
  assert.equal(errorStatus(new SyntaxError('Bad JSON')), 400)
  assert.equal(errorStatus(new Error('Redis unavailable')), 503)
  assert.equal(errorStatus(new TypeError('fetch failed')), 503)
})

const alarm = { id: 'a', groupId: 'g', revision: 2, status: 'scheduled', scheduledAt: 100_000 }
const start = { alarmId: 'a', revision: 2, kind: 'start', state: 'scheduled', dueAt: 100_000 }
const warning = { ...start, kind: 'warning', dueAt: 40_000 }

test('dispatch allows due events, retries early arrivals and expires warning/start deadlines', () => {
  assert.equal(dispatchDecision(alarm, warning, 2, 'warning', 40_000), 'send')
  assert.equal(dispatchDecision(alarm, warning, 2, 'warning', 39_999), 'retry')
  assert.equal(dispatchDecision(alarm, warning, 2, 'warning', 100_000), 'skip')
  assert.equal(dispatchDecision(alarm, start, 2, 'start', 100_000), 'send')
  assert.equal(dispatchDecision(alarm, start, 2, 'start', 399_999), 'send')
  assert.equal(dispatchDecision(alarm, start, 2, 'start', 400_000), 'skip')
  assert.equal(dispatchDecision({ ...alarm, status: 'scheduling' }, start, 2, 'start', 100_000), 'retry')
})

test('cancelled, superseded, missing and replayed events are skipped; transient failures retry', () => {
  for (const status of ['cancelled', 'failed']) assert.equal(dispatchDecision({ ...alarm, status }, start, 2, 'start', 100_000), 'skip')
  for (const state of ['cancelled', 'sent']) assert.equal(dispatchDecision(alarm, { ...start, state }, 2, 'start', 100_000), 'skip')
  assert.equal(dispatchDecision(alarm, start, 1, 'start', 100_000), 'skip')
  assert.equal(dispatchDecision(null, start, 2, 'start', 100_000), 'skip')
  assert.equal(dispatchDecision(alarm, null, 2, 'start', 100_000), 'skip')
  assert.equal(dispatchDecision(alarm, { ...start, state: 'failed' }, 2, 'start', 100_000), 'send')
})
