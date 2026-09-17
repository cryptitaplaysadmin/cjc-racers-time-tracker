import type { Alarm, ActiveTimer } from './types'
import { ACTIVITY_META } from './types'
type Snapshot = { v: 1; name: string; alarms: Alarm[]; timer: ActiveTimer }
export function readShare(hash: string): Snapshot | null {
  if (!hash.startsWith('#share=')) return null
  if (hash.length > 100000) throw new Error('Link too large')
  const value = JSON.parse(decodeURIComponent(hash.slice(7)))
  const valid = (a: any) => a && Object.hasOwn(ACTIVITY_META, a.activity) && typeof a.label === 'string' && a.label.length <= 200
  if (value.v !== 1 || typeof value.name !== 'string' || value.name.length > 80 || !Array.isArray(value.alarms) || value.alarms.length > 100 || !value.alarms.every((a: any) => valid(a) && a.activity !== 'farming' && typeof a.id === 'string' && Number.isFinite(a.scheduledAt) && Number.isFinite(a.createdAt)) || (value.timer !== null && !(valid(value.timer) && value.timer.activity === 'farming' && Number.isFinite(value.timer.startedAt)))) throw new Error('Invalid link')
  return value
}
export function makeShare(name: string, alarms: Alarm[], timer: ActiveTimer): string {
  const snapshot: Snapshot = {v: 1, name: name.trim(), alarms: alarms.filter(a => a.status === 'pending').map(a => ({...a, warned: false, status: 'pending'})), timer}
  return window.location.origin + window.location.pathname + '#share=' + encodeURIComponent(JSON.stringify(snapshot))
}
