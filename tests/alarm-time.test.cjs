const test = require('node:test')
const assert = require('node:assert/strict')
const load = require('./load-server.cjs')({})
const { CROPS, getCrop } = load('lib/crops.ts')
const { HALF_HOUR_SLOTS, defaultTimeString, timeStringToTimestamp } = load('lib/time.ts')
const local = (day, hour, minute, second = 0) => new Date(2026, 8, day, hour, minute, second).getTime()

test('all eleven crops map to the requested harvest durations', () => {
  const expected = { carrots: 8, wheat: 8, grape: 4, corn: 4, sugar_cane: 4, apple: 4, pineapple: 4, melon: 2, kiwi: 2, strawberry: 2, blueberry: 2 }
  assert.equal(CROPS.length, 11)
  assert.equal(new Set(CROPS.map((crop) => crop.id)).size, 11)
  for (const [id, hours] of Object.entries(expected)) {
    const crop = getCrop(id)
    assert.ok(crop, `${id} must exist`)
    assert.equal(crop.hours, hours)
    assert.equal(crop.durationMs, hours * 60 * 60 * 1000)
    assert.ok(crop.name.length > 0)
  }
  for (const invalid of ['potato', '', null, undefined, {}, '__proto__']) assert.equal(getCrop(invalid), undefined)
})

test('time picker covers exactly 48 unique half-hour slots with AM/PM labels', () => {
  assert.equal(HALF_HOUR_SLOTS.length, 48)
  assert.equal(new Set(HALF_HOUR_SLOTS.map((slot) => slot.value)).size, 48)
  assert.equal(new Set(HALF_HOUR_SLOTS.map((slot) => slot.label)).size, 48)
  for (let index = 0; index < 48; index++) {
    const slot = HALF_HOUR_SLOTS[index]
    const [hour, minute] = slot.value.split(':').map(Number)
    assert.equal(hour * 60 + minute, index * 30)
    assert.match(slot.label, /^(?:[1-9]|1[0-2]):(?:00|30) (?:AM|PM)$/)
    assert.equal(slot.label.endsWith('AM'), hour < 12)
  }
  assert.deepEqual(HALF_HOUR_SLOTS[0], { value: '00:00', label: '12:00 AM' })
  assert.deepEqual(HALF_HOUR_SLOTS[24], { value: '12:00', label: '12:00 PM' })
  assert.deepEqual(HALF_HOUR_SLOTS[47], { value: '23:30', label: '11:30 PM' })
})

test('default picks the next half-hour, including exact boundaries and midnight', () => {
  for (const [hour, minute, second, expected] of [
    [0, 0, 0, '00:30'], [8, 5, 12, '08:30'], [8, 29, 59, '08:30'],
    [8, 30, 0, '09:00'], [11, 59, 59, '12:00'], [23, 30, 0, '00:00'], [23, 59, 59, '00:00'],
  ]) assert.equal(defaultTimeString(30, local(17, hour, minute, second)), expected)
  const now = local(17, 23, 59)
  assert.equal(timeStringToTimestamp(defaultTimeString(30, now), true, now), local(18, 0, 0))
})

test('selected times use local calendar dates and roll passed slots into tomorrow', () => {
  const now = local(17, 12, 0)
  assert.equal(timeStringToTimestamp('12:30', true, now), local(17, 12, 30))
  assert.equal(timeStringToTimestamp('12:00', true, now), local(18, 12, 0))
  assert.equal(timeStringToTimestamp('00:00', true, now), local(18, 0, 0))
  assert.equal(timeStringToTimestamp('11:30', true, now), local(18, 11, 30))
  assert.equal(timeStringToTimestamp('11:30', false, now), local(17, 11, 30))
  for (const invalid of ['', '24:00', '12:60', '9:00', '12 PM']) assert.ok(Number.isNaN(timeStringToTimestamp(invalid, true, now)))
})
