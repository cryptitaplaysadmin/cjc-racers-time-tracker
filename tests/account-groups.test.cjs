const test = require('node:test')
const assert = require('node:assert/strict')
// Load actual pure domain logic without Next.js or live Redis credentials.
const { generateGroupCode, normalizeGroupCode, cleanAccountName, playingTransition } = require('./load-server.cjs')({})('lib/server/groups.ts')
const group = () => ({ id: 'account-a', accountName: 'GameUsername', code: 'A'.repeat(24), playing: null, revision: 0, createdAt: 1 })
const alice = { deviceId: 'alice-device', groupId: 'account-a', name: 'Alice', role: 'admin', issuedAt: 1 }
const bob = { ...alice, deviceId: 'bob-device', name: 'Bob', role: 'member' }

test('group codes are distinct, normalized, and reject malformed input', () => {
  const codes = new Set(Array.from({ length: 1000 }, generateGroupCode))
  assert.equal(codes.size, 1000)
  for (const code of codes) assert.match(code, /^[A-F0-9]{24}$/)
  assert.equal(normalizeGroupCode('aaaaaa-bbbbbb-cccccc-dddddd'), 'AAAAAABBBBBBCCCCCCDDDDDD')
  for (const bad of ['', null, {}, 'short', 'Z'.repeat(24)]) assert.throws(() => normalizeGroupCode(bad))
  assert.equal(cleanAccountName('  GameUsername  '), 'GameUsername')
  assert.throws(() => cleanAccountName(' '))
})

test('start and stop are explicit, preserve account identity, and do not mutate source', () => {
  const before = group()
  const started = playingTransition(before, alice, 'start', 0, 100)
  assert.equal(before.playing, null)
  assert.deepEqual(started.playing, { deviceId: alice.deviceId, name: 'Alice', startedAt: 100 })
  assert.equal(started.accountName, 'GameUsername')
  assert.equal(started.revision, 1)
  assert.equal(playingTransition(started, alice, 'stop', 1, 200).playing, null)
})

test('another member cannot silently claim or clear the current player', () => {
  const playing = playingTransition(group(), alice, 'start', 0, 100)
  assert.throws(() => playingTransition(playing, bob, 'start', 1), /Confirm takeover/)
  assert.throws(() => playingTransition(playing, bob, 'stop', 1), /Only the current player/)
  const taken = playingTransition(playing, bob, 'takeover', 1, 200)
  assert.equal(taken.playing.name, 'Bob')
  assert.equal(taken.playing.startedAt, 200)
  assert.equal(taken.revision, 2)
  assert.throws(() => playingTransition(taken, alice, 'stop', 1), /changed/)
})

test('stale takeover cannot replace a newer claim, including the same named player', () => {
  const initial = playingTransition(group(), alice, 'start', 0, 100)
  const stopped = playingTransition(initial, alice, 'stop', 1, 200)
  const restarted = playingTransition(stopped, alice, 'start', 2, 300)
  assert.throws(() => playingTransition(restarted, bob, 'takeover', 1), /changed/)
})

test('group isolation and invalid transitions are enforced independently of role', () => {
  assert.throws(() => playingTransition(group(), { ...alice, groupId: 'account-b' }, 'start', 0), /Group not found/)
  assert.throws(() => playingTransition(group(), alice, 'takeover', 0))
  assert.throws(() => playingTransition(group(), alice, 'stop', 0))
  assert.throws(() => playingTransition(group(), alice, 'timer-created', 0))
  assert.throws(() => playingTransition(group(), alice, 'start', '0'))
})
