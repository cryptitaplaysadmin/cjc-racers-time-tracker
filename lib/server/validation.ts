import type { ActivityKind } from '@/lib/types'
import { getCrop } from '@/lib/crops'
import { ApiError } from './errors'

const activities = new Set<ActivityKind>(['champion_stake', 'grand_master_cup', 'farming'])
export function parseJson<T>(value: unknown): T { return value as T }
export function cleanName(value: unknown) { const name = typeof value === 'string' ? value.trim() : ''; if (name.length < 1 || name.length > 40) throw new ApiError('Display name must be 1–40 characters.', 400); return name }
export function cleanAlarm(input: Record<string, unknown>, now = Date.now()) {
  if (!input || typeof input !== 'object') throw new ApiError('Invalid alarm input.', 400)
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const scheduledAt = Number(input.scheduledAt)
  const timezone = typeof input.timezone === 'string' ? input.timezone : 'UTC'
  if (!activities.has(input.activity as ActivityKind)) throw new ApiError('Invalid activity.', 400)
  if (input.activity === 'farming') {
    const crop = getCrop(input.cropId)
    if (!crop) throw new ApiError('Choose a valid crop.', 400)
    if (label.length > 120) throw new ApiError('Label must be at most 120 characters.', 400)
    return { activity: 'farming' as const, cropId: crop.id, label: label || `${crop.name} harvest`, scheduledAt: now + crop.durationMs, timezone: timezone.slice(0, 80) }
  }
  if (!label || label.length > 120) throw new ApiError('Label must be 1–120 characters.', 400)
  if (!Number.isFinite(scheduledAt) || scheduledAt <= now) throw new ApiError('Scheduled time must be in the future.', 400)
  if (scheduledAt > now + 24 * 60 * 60 * 1000) throw new ApiError('Alarms can be scheduled up to 24 hours ahead.', 400)
  return { activity: input.activity as ActivityKind, label, scheduledAt, timezone: timezone.slice(0, 80) }
}
export function cleanPushSubscription(input: unknown) {
  const sub = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (typeof sub?.endpoint !== 'string' || sub.endpoint.length > 2048) throw new ApiError('Invalid push endpoint.', 400)
  let url: URL
  try { url = new URL(sub.endpoint) } catch { throw new ApiError('Invalid push endpoint.', 400) }
  if (url.protocol !== 'https:' || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname)) throw new ApiError('Unsafe push endpoint.', 400)
  if (typeof sub.keys?.p256dh !== 'string' || typeof sub.keys.auth !== 'string') throw new ApiError('Invalid push keys.', 400)
  return { endpoint: url.toString(), keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }
}
