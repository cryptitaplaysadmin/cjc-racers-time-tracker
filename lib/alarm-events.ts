import type { Alarm } from './types'

export const alarmEventId = (alarm: Alarm) => `cjc:${alarm.id}:${alarm.revision ?? 1}:start`
export function dueAlarms(alarms: Alarm[], now: number, dismissed: Set<string>) {
  return alarms.filter(alarm => (alarm.status === 'scheduled' || alarm.status === 'ringing') && alarm.scheduledAt <= now && now < alarm.scheduledAt + 300_000 && !dismissed.has(alarmEventId(alarm))).sort((a, b) => a.scheduledAt - b.scheduledAt)
}
