'use client'
import { useState } from 'react'
import { formatCountdown } from '@/lib/time'
import type { AccountGroup } from '@/hooks/use-race-clock'

export function GroupStopwatch({ group, now, onChange }: { group: AccountGroup; now: number; onChange: (action: 'start' | 'stop' | 'reset', revision: number, label?: string) => Promise<void> }) {
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const timer = group.stopwatch
  const run = async (action: 'start' | 'stop' | 'reset') => { setBusy(true); setError(''); try { await onChange(action, group.revision, label) } catch (error) { setError(error instanceof Error ? error.message : 'Update failed.') } finally { setBusy(false) } }
  return <section className="mx-5 mb-5 space-y-3 rounded-xl border border-border p-4"><h2 className="font-display text-lg">Shared stopwatch</h2><p className="text-sm text-muted-foreground">Start, stop and reset for everyone in this group.</p><p>{timer?.label}</p><p className="font-display text-3xl tabular">{formatCountdown(timer ? (timer.stoppedAt ?? now) - timer.startedAt : 0)}</p>{(!timer || timer.stoppedAt !== null) && <input aria-label="Stopwatch label" maxLength={120} value={label} onChange={event => setLabel(event.target.value)} placeholder="Stopwatch label" className="w-full rounded-lg border bg-background p-2" />}<div className="flex gap-4"><button disabled={busy} className="underline" onClick={() => void run(timer && timer.stoppedAt === null ? 'stop' : 'start')}>{timer && timer.stoppedAt === null ? 'Stop for everyone' : 'Start stopwatch'}</button>{timer && <button disabled={busy} className="underline" onClick={() => void run('reset')}>Reset</button>}</div>{error && <p role="alert" className="text-destructive">{error}</p>}</section>
}
