'use client'

import { useState } from 'react'
import { AlarmClockPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ACTIVITY_META,
  ACTIVITY_ORDER,
  type ActivityKind,
} from '@/lib/types'
import { defaultTimeString, formatDayLabel, timeStringToTimestamp } from '@/lib/time'

export function AlarmForm({
  onAdd,
  onFarm,
}: {
  onFarm: (label: string) => void
  onAdd: (input: { activity: ActivityKind; label: string; scheduledAt: number }) => Promise<void>
}) {
  const [activity, setActivity] = useState<ActivityKind>('champion_stake')
  const [label, setLabel] = useState('')
  const [time, setTime] = useState(() => defaultTimeString(30))
  const [justAdded, setJustAdded] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const scheduledAt = timeStringToTimestamp(time)
  const canAdd = label.trim().length > 0 && (activity === 'farming' || /^\d{2}:\d{2}$/.test(time))

  return (
    <section className="mx-5 space-y-5 rounded-2xl border border-border bg-card/60 p-5">
      <div>
        <h2 className="font-display text-lg font-semibold uppercase tracking-tight">
          Set an alarm
        </h2>
        <p className="text-sm text-muted-foreground">
          Cup alarms warn one minute before the start. Farming uses a stopwatch.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Activity type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITY_ORDER.map((kind) => {
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
          htmlFor="alarm-label"
          className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground"
        >
          Label
        </label>
        <input
          id="alarm-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Activity label…"
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {activity !== 'farming' && <div>
        <label
          htmlFor="alarm-time"
          className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground"
        >
          Time
        </label>
        <input
          id="alarm-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 font-display tabular text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring [color-scheme:dark]"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Rings {formatDayLabel(scheduledAt).toLowerCase()} at{' '}
          {new Date(scheduledAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>}
      {activity === 'farming' && <p className="text-sm text-muted-foreground">Counts elapsed time until you stop it. No scheduled alarm.</p>}

      <Button
        size="lg"
        disabled={!canAdd || saving}
        className="h-14 w-full font-display text-base uppercase tracking-wide"
        onClick={async () => {
          setError('')
          if (activity === 'farming') onFarm(label.trim())
          else {
            setSaving(true)
            try { await onAdd({ activity, label: label.trim(), scheduledAt }) }
            catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not schedule this alarm.'); setSaving(false); return }
            setSaving(false)
          }
          setLabel('')
          setTime(defaultTimeString(30))
          setJustAdded(true)
          window.setTimeout(() => setJustAdded(false), 1800)
        }}
      >
        <AlarmClockPlus className="size-4" aria-hidden />
        {activity === 'farming' ? 'Start farming stopwatch' : saving ? 'Scheduling…' : justAdded ? 'Alarm added!' : 'Add to schedule'}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  )
}
