'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityBadge } from '@/components/activity-badge'
import { ACTIVITY_META, type Alarm } from '@/lib/types'
import { formatClock, formatCountdown, formatDayLabel } from '@/lib/time'

export function CountdownHero({
  alarm,
  now,
  onCreate,
}: {
  alarm: Alarm | null
  now: number
  onCreate: () => void
}) {
  if (!alarm) {
    return (
      <section className="mx-5 rounded-2xl border border-border bg-card/60 p-6 text-center">
        <p className="font-display text-lg uppercase tracking-wide text-muted-foreground">
          No alarms on the grid
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Line up your next cup or farming session.
        </p>
        <Button
          className="mt-4 font-display uppercase tracking-wide"
          onClick={onCreate}
        >
          <Plus className="size-4" aria-hidden />
          Set an alarm
        </Button>
      </section>
    )
  }

  const meta = ACTIVITY_META[alarm.activity]
  const remaining = alarm.scheduledAt - now

  return (
    <section
      className="relative mx-5 overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: `color-mix(in oklch, ${meta.colorVar} 40%, transparent)`,
        background: `linear-gradient(160deg, color-mix(in oklch, ${meta.colorVar} 16%, var(--card)), var(--card))`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Next up
        </span>
        <ActivityBadge activity={alarm.activity} size="sm" />
      </div>

      <p
        className="mt-5 font-display tabular text-6xl font-bold leading-none tracking-tight"
        style={{ color: meta.colorVar }}
      >
        {formatCountdown(remaining)}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold uppercase tracking-tight">
            {alarm.label}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDayLabel(alarm.scheduledAt)} · {formatClock(alarm.scheduledAt)}
          </p>
        </div>
      </div>
    </section>
  )
}
