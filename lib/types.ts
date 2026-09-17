import type { LucideIcon } from 'lucide-react'
import { Trophy, Medal, Sprout } from 'lucide-react'

export type ActivityKind =
  | 'champion_stake'
  | 'grand_master_cup'
  | 'farming'

export type Alarm = {
  id: string
  activity: ActivityKind
  label: string
  scheduledAt: number // epoch ms
  status: 'pending' | 'ringing' | 'done' | 'dismissed' | 'scheduling' | 'scheduled' | 'cancelled' | 'failed'
  warned?: boolean
  createdAt: number
  /** Fields supplied by the shared-schedule API. Older local alarms omit them. */
  creatorName?: string
  creatorId?: string
  cropId?: string
  revision?: number
  lifecycle?: 'scheduling' | 'scheduled' | 'failed' | 'cancelled'
  error?: string
}

export type HistoryEntry = {
  alarmEventId?: string
  id: string
  activity: ActivityKind
  label: string
  at: number // completed epoch ms
  durationMs?: number // present for tracked sessions
  source: 'alarm' | 'timer'
}

export type ActiveTimer = {
  activity: ActivityKind
  label: string
  startedAt: number
} | null

export const ACTIVITY_META: Record<
  ActivityKind,
  { label: string; icon: LucideIcon; colorVar: string }
> = {
  champion_stake: { label: 'Champion Stake', icon: Medal, colorVar: 'var(--champion)' },
  grand_master_cup: { label: 'Grand Master Cup', icon: Trophy, colorVar: 'var(--grandmaster)' },
  farming: { label: 'Farming', icon: Sprout, colorVar: 'var(--farming)' },
}

export const ACTIVITY_ORDER: ActivityKind[] = [
  'champion_stake',
  'grand_master_cup',
  'farming',
]
