const test = require('node:test')
const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const loader = require('./load-server.cjs')

test('browser migration erases only old app data, runs once, preserves fresh history', () => {
  const { resetLegacyBrowserData, DATA_VERSION } = loader({})('lib/data-version.ts')
  const values = new Map([['cjc.history', 'old'], ['cjc.timer', 'old'], ['cjc.silenced.group', 'old'], ['unrelated', 'keep']])
  const storage = { get length() { return values.size }, key: n => [...values.keys()][n], getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  resetLegacyBrowserData(storage)
  assert.deepEqual([...values], [['unrelated', 'keep'], ['cjc.data-version', DATA_VERSION]])
  values.set('cjc.history', 'new')
  resetLegacyBrowserData(storage)
  assert.equal(values.get('cjc.history'), 'new')
})

test('legacy session signatures cannot authenticate after reset; fresh sessions work', () => {
  const auth = loader({ 'lib/server/config.ts': { getConfig: () => ({ SESSION_SECRET: 'test' }) }, 'next/headers': {} })('lib/server/auth.ts')
  const session = auth.makeSession('Player', 'member', 'group')
  const raw = Buffer.from(JSON.stringify(session)).toString('base64url')
  const old = `${raw}.${createHmac('sha256', 'test').update(raw).digest('base64url')}`
  assert.equal(auth.decodeSession(old), null)
  assert.deepEqual(auth.decodeSession(auth.encodeSession(session)), session)
})
