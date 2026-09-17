const test = require('node:test')
const assert = require('node:assert/strict')
const loader = require('./load-server.cjs')

test('QStash receives valid stable IDs, distinct warning/start IDs and correct deadlines', async () => {
  const published = [], saved = []
  const { scheduleAlarm } = loader({
    '@upstash/qstash': { Client: class { async publishJSON(input) { assert.match(input.deduplicationId, /^[a-f0-9]{64}$/); published.push(input); return { messageId: 'job' } } } },
    'lib/server/config.ts': { getConfig: () => ({ APP_ENV: 'production', APP_ORIGIN: 'https://example.com', QSTASH_TOKEN: 'test' }) },
    'lib/server/store.ts': { store: { saveDispatch: async value => saved.push(value) } },
  })('lib/server/scheduler.ts')
  const alarm = { id: 'alarm-id', revision: 1, scheduledAt: Date.now() + 180000 }
  await scheduleAlarm(alarm)
  await scheduleAlarm(alarm)
  assert.notEqual(published[0].deduplicationId, published[1].deduplicationId)
  assert.equal(published[0].deduplicationId, published[2].deduplicationId)
  assert.equal(published[1].notBefore, Math.ceil(alarm.scheduledAt / 1000))
  assert.equal(published[0].notBefore, Math.ceil((alarm.scheduledAt - 60000) / 1000))
  assert.equal(saved[1].state, 'scheduled')
})
