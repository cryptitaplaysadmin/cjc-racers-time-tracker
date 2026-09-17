'use client'

import { useState } from 'react'
import { AlarmClockPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ACTIVITY_META, ACTIVITY_ORDER, type ActivityKind } from '@/lib/types'
import { CROPS, getCrop, type AlarmInput, type CropId } from '@/lib/crops'
import { defaultTimeString, formatDayLabel, HALF_HOUR_SLOTS, timeStringToTimestamp } from '@/lib/time'

export function AlarmForm({ onAdd, farmingOnly = false }: {
  onAdd: (input: AlarmInput) => Promise<void>
  farmingOnly?: boolean
}) {
  const [activity, setActivity] = useState<ActivityKind>(farmingOnly ? 'farming' : 'champion_stake')
  const [label, setLabel] = useState('')
  const [cropId, setCropId] = useState<CropId>('carrots')
  const [time, setTime] = useState(() => defaultTimeString())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const scheduledAt = timeStringToTimestamp(time)
  const crop = getCrop(cropId)!
  const canAdd = activity === 'farming' || (label.trim().length > 0 && HALF_HOUR_SLOTS.some((slot) => slot.value === time))
  return <form className="mx-5 space-y-5 rounded-2xl border border-border bg-card/60 p-5" onSubmit={async (event) => {
    event.preventDefault()
    if (!canAdd || saving) return
    setError(''); setMessage(''); setSaving(true)
    try {
      await onAdd(activity === 'farming' ? { activity, cropId, ...(label.trim() ? { label: label.trim() } : {}) } : { activity, label: label.trim(), scheduledAt: timeStringToTimestamp(time) })
      setLabel(''); setTime(defaultTimeString()); setMessage(activity === 'farming' ? `${crop.name} countdown added to the group.` : 'Alarm added to the group.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not schedule this alarm.') }
    finally { setSaving(false) }
  }}>
    <div><h2 className="font-display text-lg font-semibold uppercase tracking-tight">{farmingOnly ? 'Plant a crop' : 'Set an alarm'}</h2><p className="text-sm text-muted-foreground">{activity === 'farming' ? 'Choose one crop per countdown. Plant again to add more.' : 'Cup alarms warn one minute before the start.'}</p></div>
    {!farmingOnly && <div><p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Activity type</p><div className="grid grid-cols-2 gap-2">{ACTIVITY_ORDER.map((kind) => {
      const meta = ACTIVITY_META[kind]; const Icon = meta.icon; const active = activity === kind
      return <button key={kind} disabled={saving} type="button" aria-pressed={active} onClick={() => { setActivity(kind); setMessage(''); setError('') }} className="flex items-center gap-2 rounded-xl border p-3 text-left transition-colors" style={{ borderColor: active ? meta.colorVar : 'var(--border)', backgroundColor: active ? `color-mix(in oklch, ${meta.colorVar} 14%, transparent)` : 'transparent' }}><Icon className="size-4" aria-hidden /><span className="font-display text-sm uppercase tracking-wide">{meta.label}</span></button>
    })}</div></div>}
    {activity === 'farming' ? <div><label htmlFor="alarm-crop" className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Crop</label><select id="alarm-crop" disabled={saving} value={cropId} onChange={(event) => setCropId(event.target.value as CropId)} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm">{CROPS.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.hours} hours</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Ready {crop.hours} hours after planting. The saved countdown shows the exact harvest time for everyone.</p></div> : <div className="flex gap-2" aria-label="Race label presets">{['Sprint', 'Middle', 'Long'].map((preset) => <button key={preset} type="button" disabled={saving} aria-pressed={label === preset} onClick={() => setLabel(preset)} className="flex-1 rounded-xl border border-input p-3 text-sm">{preset}</button>)}</div>}
    <div><label htmlFor="alarm-label" className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">{activity === 'farming' ? 'Label (optional)' : 'Race label'}</label><input id="alarm-label" disabled={saving} required={activity !== 'farming'} maxLength={120} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={activity === 'farming' ? `${crop.name} plot…` : 'Choose a preset or enter your label…'} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm" /></div>
    {activity !== 'farming' && <div><label htmlFor="alarm-time" className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Time</label><select id="alarm-time" disabled={saving} value={time} onChange={(event) => setTime(event.target.value)} className="h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-lg">{HALF_HOUR_SLOTS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Rings {formatDayLabel(scheduledAt).toLowerCase()} at {HALF_HOUR_SLOTS.find((slot) => slot.value === time)?.label} in your local time. Passed times roll to tomorrow.</p></div>}
    <Button type="submit" size="lg" disabled={!canAdd || saving} className="h-14 w-full font-display text-base uppercase tracking-wide"><AlarmClockPlus className="size-4" aria-hidden />{saving ? 'Scheduling…' : activity === 'farming' ? `Plant ${crop.name}` : 'Add to schedule'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-accent">{message}</p>}
  </form>
}
