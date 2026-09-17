'use client'

import { useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { ActivityBadge } from '@/components/activity-badge'
import { type Alarm } from '@/lib/types'
import { formatClock, formatCountdown, formatDayLabel } from '@/lib/time'

export function ScheduleList({
  alarms,
  now,
  onComplete,
  onStartTimer,
  onDelete,
  readOnly = false,
  canManage,
  onEdit,
}: {
  readOnly?: boolean
  alarms: Alarm[]
  now: number
  onComplete: (a: Alarm) => void
  onStartTimer: (a: Alarm) => void
  onDelete: (id: string) => Promise<void>
  canManage: (alarm: Alarm) => boolean
  onEdit: (alarm: Alarm) => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  if (alarms.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        Your schedule is clear. Add an alarm to fill the grid.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2.5 px-5">
      {error && <li role="alert" className="text-sm text-destructive">{error}</li>}
      {alarms.map((alarm) => {
        const remaining = alarm.scheduledAt - now
        const isRinging = alarm.status === 'ringing'
        return (
          <li
            key={alarm.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
          >
            <div className="flex w-16 shrink-0 flex-col items-center">
              <span className="font-display tabular text-base font-semibold leading-none">
                {formatClock(alarm.scheduledAt)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {formatDayLabel(alarm.scheduledAt)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-semibold uppercase tracking-tight">
                {alarm.label}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ActivityBadge activity={alarm.activity} size="sm" />
                <span
                  className={`tabular text-xs ${isRinging ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {alarm.status === 'failed' ? 'Scheduling failed' : alarm.status === 'scheduling' ? 'Scheduling…' : isRinging ? 'Ringing' : remaining <= 0 ? 'Due' : `in ${formatCountdown(remaining)}`}
                </span>
              </div>
              {alarm.error && <p role="alert" className="text-xs text-destructive">{alarm.error}</p>}
            </div>

            {!readOnly && <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onComplete(alarm)}
                className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-primary/20"
                title="Mark complete"
              >
                <Check className="size-4" aria-hidden />
                <span className="sr-only">Mark complete</span>
              </button>
              {canManage(alarm) && <button type="button" onClick={() => onEdit(alarm)} className="flex size-9 items-center justify-center rounded-lg bg-secondary" aria-label={`Edit ${alarm.label}`}><Pencil className="size-4" /></button>}
              {canManage(alarm) && <button
                type="button"
                disabled={busy !== null}
                onClick={async () => { setBusy(alarm.id); setError(''); try { await onDelete(alarm.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel alarm.') } finally { setBusy(null) } }}
                className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-destructive"
                title="Delete alarm"
              >
                <Trash2 className="size-4" aria-hidden />
                <span className="sr-only">Delete alarm</span>
              </button>}
            </div>}
          </li>
        )
      })}
    </ul>
  )
}
