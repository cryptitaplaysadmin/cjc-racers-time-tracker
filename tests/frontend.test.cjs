const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-server.cjs')({})

test('race form exposes all half-hour choices and label presets', () => {
  const { AlarmForm } = load('components/alarm-form.tsx')
  const html = renderToStaticMarkup(React.createElement(AlarmForm, { onAdd: async () => {} }))
  assert.equal((html.match(/<option /g) || []).length, 48)
  for (const text of ['Sprint', 'Middle', 'Long', '12:00 AM', '11:30 PM']) assert.ok(html.includes(text), text)
})

test('farm form exposes eleven crops and edit explicitly explains countdown restart', () => {
  const { AlarmForm } = load('components/alarm-form.tsx')
  const html = renderToStaticMarkup(React.createElement(AlarmForm, { onAdd: async () => {}, farmingOnly: true, initial: { id: 'a', activity: 'farming', label: 'Crop', cropId: 'kiwi', scheduledAt: Date.now() + 100000 } }))
  assert.equal((html.match(/<option /g) || []).length, 11)
  assert.ok(html.includes('restarts its full countdown'))
  assert.match(html, /value="kiwi" selected/)
})

test('schedule management controls mirror server permissions', () => {
  const { ScheduleList } = load('components/schedule-list.tsx')
  const props = { alarms: [{ id: 'a', activity: 'farming', label: 'Melon', status: 'scheduled', scheduledAt: Date.now() + 10000 }], now: Date.now(), onComplete() {}, onStartTimer() {}, onDelete: async () => {}, onEdit() {} }
  const viewer = renderToStaticMarkup(React.createElement(ScheduleList, { ...props, canManage: () => false }))
  assert.ok(!viewer.includes('Delete alarm'))
  assert.ok(!viewer.includes('Edit Melon'))
  const owner = renderToStaticMarkup(React.createElement(ScheduleList, { ...props, canManage: () => true }))
  assert.ok(owner.includes('Delete alarm'))
  assert.ok(owner.includes('Edit Melon'))
})
