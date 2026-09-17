'use client'

import { useState } from 'react'
import { Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityBadge } from '@/components/activity-badge'
import {
  ACTIVITY_META,
  ACTIVITY_ORDER,
  type ActiveTimer,
  type ActivityKind,
} from '@/lib/types'
import { formatCountdown } from '@/lib/time'

export function TimerPanel({
  timer,
  now,
  onStart,
  onStop,
  onCancel,
  readOnly = false,
}: {
  readOnly?: boolean
  timer: ActiveTimer
  now: number
  onStart: (activity: ActivityKind, label: string) => void
  onStop: () => void
  onCancel: () => void
}) {
  const [activity, setActivity] = useState<ActivityKind>('farming')
  const [label, setLabel] = useState('')

  if (timer) {
    const meta = ACTIVITY_META[timer.activity]
    const elapsed = now - timer.startedAt
    return (
      <section className="mx-5 flex flex-col items-center gap-6 rounded-2xl border border-border bg-card/60 p-8 text-center">
        <ActivityBadge activity={timer.activity} />
        <p className="font-display text-lg font-semibold uppercase tracking-tight">
          {timer.label}
        </p>
        <div
          className="flex size-52 flex-col items-center justify-center rounded-full border-4"
          style={{
            borderColor: `color-mix(in oklch, ${meta.colorVar} 55%, transparent)`,
            boxShadow: `inset 0 0 40px color-mix(in oklch, ${meta.colorVar} 20%, transparent)`,
          }}
        >
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Elapsed
          </span>
          <span
            className="font-display tabular text-4xl font-bold"
            style={{ color: meta.colorVar }}
          >
            {formatCountdown(elapsed)}
          </span>
        </div>
        {!readOnly && <div className="flex w-full max-w-xs flex-col gap-3">
          <Button
            size="lg"
            className="h-14 w-full font-display text-base uppercase tracking-wide"
            onClick={onStop}
          >
            <Square className="size-4" aria-hidden />
            Stop &amp; log session
          </Button>
          <Button
            variant="ghost"
            className="font-display uppercase tracking-wide text-muted-foreground"
            onClick={onCancel}
          >
            <X className="size-4" aria-hidden />
            Discard
          </Button>
        </div>}
      </section>
    )
  }

  if (readOnly) return <p className="px-5 text-muted-foreground">No farming stopwatch in this shared snapshot.</p>

  const canStart = label.trim().length > 0

  return (
    <section className="mx-5 space-y-5 rounded-2xl border border-border bg-card/60 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
          Farming stopwatch
        </h2>
        <p className="text-sm text-muted-foreground">
          Start a stopwatch and log the time you spend.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Activity type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_ORDER.filter(kind => kind === 'farming').map((kind) => {
            const meta = ACTIVITY_META[kind]
            const Icon = meta.icon
            const active = activity === kind
            return (
              <button
                key={kind}
                type="button"
                onClick={() => setActivity(kind)}
                className="flex items-center gap-2 rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: active
                    ? `color-mix(in oklch, ${meta.colorVar} 60%, transparent)`
                    : 'var(--border)',
                  backgroundColor: active
                    ? `color-mix(in oklch, ${meta.colorVar} 14%, transparent)`
                    : 'transparent',
                }}
              >
                <Icon
                  className="size-4"
                  style={{ color: active ? meta.colorVar : 'var(--muted-foreground)' }}
                  aria-hidden
                />
                <span className="font-display text-sm uppercase tracking-wide">
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="timer-label"
          className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground"
        >
          What are you working on?
        </label>
        <input
          id="timer-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Farming session…"
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button
        size="lg"
        disabled={!canStart}
        className="h-14 w-full font-display text-base uppercase tracking-wide"
        onClick={() => {
          onStart(activity, label.trim())
          setLabel('')
        }}
      >
        Start timer
      </Button>
    </section>
  )
}
