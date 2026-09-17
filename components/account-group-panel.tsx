'use client'

import { useState } from 'react'
import type { AccountGroup } from '@/hooks/use-race-clock'

export function AccountGroupPanel({ group, deviceId, playerName, onPlaying, onLeave }: {
  group: AccountGroup
  deviceId: string
  playerName: string
  onPlaying: (action: 'start' | 'stop' | 'takeover', revision: number) => Promise<void>
  onLeave: () => Promise<void>
}) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [takeover, setTakeover] = useState<{ name: string; revision: number } | null>(null)
  const mine = group.playing?.deviceId === deviceId
  const run = async (task: () => Promise<void>) => {
    setWorking(true); setError('')
    try { await task() } catch (failure) { setError(failure instanceof Error ? failure.message : 'Please try again.') }
    finally { setWorking(false); setTakeover(null) }
  }
  return <section className="mx-5 mb-4 space-y-4 rounded-2xl border border-border bg-card/60 p-4">
    <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Game account</p><h1 className="break-words font-display text-xl font-semibold">{group.accountName}</h1><p className="mt-1 text-sm text-muted-foreground">You are {playerName}</p></div>
    <div><label htmlFor="shared-group-code" className="text-xs text-muted-foreground">Share this group code</label><div className="mt-1 flex gap-2"><input id="shared-group-code" readOnly value={group.code} onFocus={(event) => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-input bg-background p-2 font-mono text-xs" /><button className="rounded-lg border border-border px-3 text-sm" onClick={() => { if (!navigator.clipboard) { setError('Select the code and copy it manually.'); return } void navigator.clipboard.writeText(group.code).then(() => setCopied(true)).catch(() => setError('Select the code and copy it manually.')) }}>{copied ? 'Copied' : 'Copy'}</button></div></div>
    <div className="rounded-xl border border-border p-3" aria-live="polite"><p className="text-sm font-medium">{group.playing ? `Currently playing: ${group.playing.name}${mine ? ' (you)' : ''}` : 'Nobody marked as playing'}</p>{group.playing && <p className="mt-1 text-xs text-muted-foreground">Since {new Date(group.playing.startedAt).toLocaleString()}</p>}<p className="mt-2 text-xs text-muted-foreground">Manual status only. Timers do not change it, and this does not control game login or logout.</p></div>
    {takeover ? <div role="alert" className="space-y-3 rounded-xl border border-primary p-3"><p className="text-sm">Take over from {takeover.name}? Check with them before using the game account.</p><div className="flex gap-3"><button disabled={working} className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={() => void run(() => onPlaying('takeover', takeover.revision))}>Confirm takeover</button><button disabled={working} className="text-sm underline" onClick={() => setTakeover(null)}>Cancel</button></div></div> : <button disabled={working} className="w-full rounded-xl bg-primary p-3 text-sm font-medium text-primary-foreground disabled:opacity-50" onClick={() => { if (group.playing && !mine) setTakeover({ name: group.playing.name, revision: group.revision }); else void run(() => onPlaying(mine ? 'stop' : 'start', group.revision)) }}>{working ? 'Updating…' : mine ? 'I’ve stopped playing' : group.playing ? `Take over from ${group.playing.name}` : 'I’m playing this account'}</button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <button disabled={working || mine} className="text-xs text-muted-foreground underline disabled:opacity-50" onClick={() => { if (window.confirm('Leave this group? You can join another account or return using this code.')) void run(onLeave) }}>Leave / switch account group</button>
    {mine && <p className="text-xs text-muted-foreground">Mark yourself as stopped before switching groups.</p>}
  </section>
}
