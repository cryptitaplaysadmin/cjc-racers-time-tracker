'use client'

import { useState } from 'react'
import { AlarmForm } from '@/components/alarm-form'
import { getCrop, type AlarmInput } from '@/lib/crops'
import type { Alarm } from '@/lib/types'
import { formatCountdown } from '@/lib/time'

export function TimerPanel({ alarms, now, onAdd, onCancel }: {
  alarms: Alarm[]
  now: number
  onAdd: (input: AlarmInput) => Promise<void>
  onCancel: (id: string) => Promise<void>
}) {
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const crops = alarms.filter((alarm) => alarm.activity === 'farming' && alarm.status !== 'cancelled').sort((a, b) => a.scheduledAt - b.scheduledAt)
  return <div className="space-y-5">
    <section className="mx-5 space-y-3"><h2 className="font-display text-lg font-semibold uppercase">Shared crop countdowns</h2><p className="text-sm text-muted-foreground">Harvest timers for this account group.</p>
      {crops.length === 0 && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No crops planted yet.</p>}
      {crops.map((alarm) => {
        const crop = getCrop((alarm as Alarm & { cropId?: string }).cropId)
        const failed = alarm.status === 'failed'
        return <article key={alarm.id} className="space-y-2 rounded-xl border border-border bg-card/60 p-4"><h3 className="font-medium">{crop?.name ?? 'Farming'}{crop ? ` · ${crop.hours} hours` : ''}</h3><p className="text-sm text-muted-foreground">{alarm.label}</p><p className="font-display text-2xl tabular">{failed ? 'Scheduling failed' : alarm.status === 'scheduling' ? 'Scheduling…' : alarm.scheduledAt <= now ? 'Ready to harvest' : formatCountdown(alarm.scheduledAt - now)}</p><p className="text-xs text-muted-foreground">Harvest: {new Date(alarm.scheduledAt).toLocaleString()}</p>{failed && <p role="alert" className="text-xs text-destructive">{alarm.error || 'This crop timer could not be scheduled. Cancel it and try again.'}</p>}<button disabled={cancelling !== null} className="text-sm underline disabled:opacity-50" onClick={async () => { setCancelling(alarm.id); setError(''); try { await onCancel(alarm.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel this countdown.') } finally { setCancelling(null) } }}>{cancelling === alarm.id ? 'Cancelling…' : 'Cancel countdown'}</button></article>
      })}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
    <AlarmForm onAdd={onAdd} farmingOnly />
  </div>
}
