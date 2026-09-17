import type { Dispatch, SharedAlarm } from './models'
export function dispatchDecision(alarm: SharedAlarm | null, dispatch: Dispatch | null, revision: number, kind: 'warning' | 'start', now = Date.now()): 'skip' | 'retry' | 'send' {
  if (!alarm || !dispatch || alarm.revision !== revision || alarm.status === 'done' || alarm.status === 'cancelled' || alarm.status === 'failed' || dispatch.state === 'cancelled' || dispatch.state === 'sent') return 'skip'
  if (now >= (kind === 'warning' ? alarm.scheduledAt : alarm.scheduledAt + 300_000)) return 'skip'
  if (alarm.status === 'scheduling' || now < dispatch.dueAt) return 'retry'
  return 'send'
}
