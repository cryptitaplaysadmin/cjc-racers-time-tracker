import type { ActivityKind } from '@/lib/types'

export type Role = 'member' | 'admin'
export type Session = { deviceId: string; groupId: string; name: string; role: Role; issuedAt: number }
export type SharedAlarm = {
  id: string; groupId: string; creatorId: string; creatorName: string; activity: ActivityKind
  label: string; scheduledAt: number; timezone: string; revision: number
  status: 'scheduling' | 'scheduled' | 'cancelled' | 'failed'; createdAt: number; updatedAt: number
}
export type PushSubscriptionRecord = {
  deviceId: string; groupId: string; endpoint: string; keys: { p256dh: string; auth: string }
  enabled: boolean; createdAt: number; updatedAt: number
}
export type DispatchKind = 'warning' | 'start'
export type Dispatch = { alarmId: string; revision: number; kind: DispatchKind; dueAt: number; messageId?: string; state: 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'failed' }
