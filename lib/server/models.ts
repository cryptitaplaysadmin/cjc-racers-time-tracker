import type { ActivityKind } from '@/lib/types'

export type Role = 'member' | 'admin'
export type Session = { deviceId: string; groupId: string; name: string; role: Role; issuedAt: number }
export type Playing = { deviceId: string; name: string; startedAt: number }
export type AccountGroup = { id: string; accountName: string; code: string; playing: Playing | null; stopwatch?: { label: string; startedAt: number; stoppedAt: number | null } | null; revision: number; createdAt: number }
export type SharedAlarm = {
  id: string; groupId: string; creatorId: string; creatorName: string; activity: ActivityKind
  label: string; scheduledAt: number; timezone: string; revision: number
  cropId?: string
  error?: string
  status: 'scheduling' | 'scheduled' | 'cancelled' | 'failed' | 'done'; createdAt: number; updatedAt: number
}
export type PushSubscriptionRecord = {
  deviceId: string; groupId: string; endpoint: string; keys: { p256dh: string; auth: string }
  enabled: boolean; createdAt: number; updatedAt: number
}
export type DispatchKind = 'warning' | 'start'
export type Dispatch = { alarmId: string; revision: number; kind: DispatchKind; dueAt: number; messageId?: string; state: 'pending' | 'scheduled' | 'sent' | 'cancelled' | 'failed' }
