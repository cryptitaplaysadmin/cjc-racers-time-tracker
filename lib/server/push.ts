import 'server-only'
import webpush from 'web-push'
import { getConfig } from './config'
import type { PushSubscriptionRecord, SharedAlarm } from './models'

function configure() { const c = getConfig(); webpush.setVapidDetails(c.VAPID_SUBJECT, c.VAPID_PUBLIC_KEY, c.VAPID_PRIVATE_KEY) }
export function payload(alarm: SharedAlarm, kind: 'warning' | 'start') {
  const warning = kind === 'warning'
  return JSON.stringify({ title: warning ? 'CJC Racers — one minute' : 'CJC Racers — start now', body: `${alarm.label} (${alarm.creatorName})`, tag: `cjc:${alarm.id}:${alarm.revision}:${kind}`, data: { url: '/', alarmId: alarm.id, revision: alarm.revision, kind, expiresAt: warning ? alarm.scheduledAt : alarm.scheduledAt + 300_000 } })
}
export async function sendPush(subscription: PushSubscriptionRecord, body: string, ttl: number) {
  configure()
  return webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, body, { TTL: ttl, urgency: 'high' })
}
