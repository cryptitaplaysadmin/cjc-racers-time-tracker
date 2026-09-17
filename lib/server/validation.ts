import type { ActivityKind } from '@/lib/types'

const activities = new Set<ActivityKind>(['champion_stake', 'grand_master_cup', 'farming'])
export function parseJson<T>(value: unknown): T { return value as T }
export function cleanName(value: unknown) { const name = typeof value === 'string' ? value.trim() : ''; if (name.length < 1 || name.length > 40) throw new Error('Display name must be 1–40 characters.'); return name }
export function cleanAlarm(input: Record<string, unknown>) {
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const scheduledAt = Number(input.scheduledAt)
  const timezone = typeof input.timezone === 'string' ? input.timezone : 'UTC'
  if (!activities.has(input.activity as ActivityKind)) throw new Error('Invalid activity.')
  if (!label || label.length > 120) throw new Error('Label must be 1–120 characters.')
  if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) throw new Error('Scheduled time must be in the future.')
  if (scheduledAt > Date.now() + 24 * 60 * 60 * 1000) throw new Error('Alarms can be scheduled up to 24 hours ahead.')
  return { activity: input.activity as ActivityKind, label, scheduledAt, timezone: timezone.slice(0, 80) }
}
export function cleanPushSubscription(input: unknown) {
  const sub = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (typeof sub?.endpoint !== 'string' || sub.endpoint.length > 2048) throw new Error('Invalid push endpoint.')
  const url = new URL(sub.endpoint)
  if (url.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname)) throw new Error('Unsafe push endpoint.')
  if (typeof sub.keys?.p256dh !== 'string' || typeof sub.keys.auth !== 'string') throw new Error('Invalid push keys.')
  return { endpoint: url.toString(), keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }
}
