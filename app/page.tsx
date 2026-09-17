'use client'

import { useMemo, useState } from 'react'
import { LayoutDashboard, AlarmClockPlus, Timer, History } from 'lucide-react'
import { useRaceClock } from '@/hooks/use-race-clock'
import { RaceHeader } from '@/components/race-header'
import { AccountGroupPanel } from '@/components/account-group-panel'
import { CountdownHero } from '@/components/countdown-hero'
import { ScheduleList } from '@/components/schedule-list'
import { AlarmForm } from '@/components/alarm-form'
import { TimerPanel } from '@/components/timer-panel'
import { HistoryPanel } from '@/components/history-panel'
import { AlarmRinger } from '@/components/alarm-ringer'
import { AlarmControls } from '@/components/alarm-controls'
import { cn } from '@/lib/utils'
import type { Alarm } from '@/lib/types'
import { alarmEventId } from '@/lib/alarm-events'

type Tab = 'dashboard' | 'alarm' | 'timer' | 'history'
const TABS: { id: Tab; label: string; icon: typeof Timer }[] = [{ id: 'dashboard', label: 'Grid', icon: LayoutDashboard }, { id: 'alarm', label: 'Alarm', icon: AlarmClockPlus }, { id: 'timer', label: 'Farm', icon: Timer }, { id: 'history', label: 'History', icon: History }]

function JoinPanel({ onJoin, onCreate, error }: { onJoin: (name: string, code: string) => Promise<void>; onCreate: (accountName: string, name: string) => Promise<void>; error: string }) {
  const [mode, setMode] = useState<'join' | 'create'>('join')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [accountName, setAccountName] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [working, setWorking] = useState(false)
  const submit = async () => { setWorking(true); setSubmitError(''); try { if (mode === 'create') await onCreate(accountName.trim(), name.trim()); else await onJoin(name.trim(), code.trim()) } catch (failure) { setSubmitError(failure instanceof Error ? failure.message : 'Could not connect. Please try again.') } finally { setWorking(false) } }
  return <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="mx-5 mt-6 space-y-4 rounded-2xl border border-border bg-card/60 p-5">
    <div><h1 className="font-display text-xl font-semibold uppercase">Account groups</h1><p className="mt-1 text-sm text-muted-foreground">Share timers and tell your group who is playing the game account.</p></div>
    <div className="grid grid-cols-2 gap-2">{(['join', 'create'] as const).map((value) => <button key={value} type="button" disabled={working} aria-pressed={mode === value} onClick={() => { setMode(value); setSubmitError('') }} className={cn('rounded-xl border p-3 text-sm', mode === value ? 'border-primary text-primary' : 'border-border')}>{value === 'join' ? 'Join with code' : 'Create account group'}</button>)}</div>
    {mode === 'create' ? <label className="block text-sm">Game account username<input required value={accountName} maxLength={40} onChange={(event) => setAccountName(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3" autoComplete="off" /><span className="mt-1 block text-xs text-muted-foreground">The shared game account, not your personal name.</span></label> : <label className="block text-sm">Group code<input required value={code} maxLength={160} onChange={(event) => setCode(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3" autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>}
    <label className="block text-sm">Your player name<input required value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className="mt-1 h-12 w-full rounded-xl border border-input bg-background px-3" autoComplete="nickname" /><span className="mt-1 block text-xs text-muted-foreground">Your name lets others know who is playing.</span></label>
    {mode === 'create' && <p className="text-sm text-muted-foreground">A private group code is generated automatically. Share it with people who use this account.</p>}
    {(submitError || error) && <p role="alert" className="text-sm text-destructive">{submitError || error}</p>}
    <button type="submit" disabled={working || !name.trim() || !(mode === 'create' ? accountName.trim() : code.trim())} className="h-12 w-full rounded-xl bg-primary font-display uppercase tracking-wide text-primary-foreground disabled:opacity-50">{working ? 'Connecting…' : mode === 'create' ? 'Create and join group' : 'Join group'}</button>
  </form>
}

export default function Page() {
  const clock = useRaceClock()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<Alarm | null>(null)
  const canManage = () => clock.connection === 'joined' && !!clock.group
  const upcoming = useMemo(() => [...clock.alarms].filter((alarm) => alarm.status !== 'cancelled' && !clock.history.some(entry => entry.alarmEventId === alarmEventId(alarm))).sort((a, b) => a.scheduledAt - b.scheduledAt), [clock.alarms, clock.history])
  const nextAlarm = upcoming.find((alarm) => alarm.status === 'scheduled' && alarm.scheduledAt > clock.now) ?? null


  if (!clock.hydrated || clock.connection === 'loading') return <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center text-sm text-muted-foreground">Connecting to the grid…</div>
  if (clock.connection === 'error') return <div className="mx-auto max-w-md p-6"><p role="alert">{clock.connectionError}</p><button className="mt-4 underline" onClick={() => void clock.refreshSchedule()}>Retry loading schedule</button></div>
  if (clock.connection !== 'joined') return <div className="mx-auto min-h-dvh max-w-md"><RaceHeader now={clock.now} notifPermission={clock.notifPermission} pushState={clock.pushState} pushError={clock.pushError} onEnableNotifications={clock.requestNotifications} notificationsAvailable={false} /><JoinPanel onJoin={clock.join} onCreate={clock.createGroup} error={clock.connectionError} /></div>

  return <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">
    <RaceHeader now={clock.now} notifPermission={clock.notifPermission} pushState={clock.pushState} pushError={clock.pushError} onEnableNotifications={clock.requestNotifications} />
    {clock.group && clock.session && <AccountGroupPanel group={clock.group} deviceId={clock.session.deviceId} playerName={clock.name} onPlaying={clock.updatePlaying} onLeave={clock.leaveGroup} />}
    {clock.connectionError && <p role="alert" className="mx-5 mb-3 text-sm text-destructive">{clock.connectionError} <button className="underline" onClick={() => void clock.refreshSchedule()}>Retry</button></p>}
    <div className="mx-5 mb-5 space-y-2 rounded-xl border border-border p-4 text-sm"><p><span className="font-medium">{clock.name}</span> · live CJC schedule</p><p className="text-muted-foreground">{clock.pushState === 'enabled' ? 'Global notifications are enabled on this device.' : 'Enable notifications to receive race alerts when this app is in the background.'}</p>{clock.pushError && <p role="alert" className="text-destructive">{clock.pushError}</p>}{clock.pushState === 'enabled' && <div className="flex gap-3"><button className="underline" onClick={() => void clock.testNotifications()}>Send test</button><button className="underline" onClick={() => void clock.disableNotifications()}>Disable here</button></div>}</div>
    <div className="mx-5 mb-5"><AlarmControls onEnableNotifications={clock.requestNotifications} /></div><main className="flex-1">{tab === 'dashboard' ? <div className="space-y-6"><CountdownHero alarm={nextAlarm} now={clock.now} onCreate={() => { setEditing(null); setTab('alarm') }} /><div><div className="mb-3 flex items-center gap-3 px-5"><h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">Schedule</h2><span className="h-px flex-1 bg-border" /></div><ScheduleList alarms={upcoming} now={clock.now} onComplete={clock.completeAlarm} onStartTimer={() => setTab('timer')} onDelete={clock.deleteAlarm} canManage={canManage} onEdit={(alarm) => { setEditing(alarm); setTab('alarm') }} /></div></div> : tab === 'alarm' ? <div>{editing && <button className="mx-5 mb-3 underline" onClick={() => setEditing(null)}>Cancel editing</button>}<AlarmForm key={editing?.id ?? 'new'} initial={editing ?? undefined} farmingOnly={editing?.activity === 'farming'} onAdd={async (input) => { if (editing) await clock.editAlarm(editing, input); else await clock.addAlarm(input); setEditing(null); setTab('dashboard') }} /></div> : tab === 'timer' ? <div>{clock.timer && <div className="mx-5 mb-4 rounded-xl border p-4 text-sm">Previous stopwatch: {clock.timer.label}. Started {new Date(clock.timer.startedAt).toLocaleString()}. <button className="underline" onClick={clock.stopTimer}>Save to history</button></div>}<TimerPanel alarms={upcoming} now={clock.now} onAdd={clock.addAlarm} onCancel={clock.deleteAlarm} canManage={canManage} /></div> : <HistoryPanel history={clock.history} onClear={clock.clearHistory} />}</main>
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/90 backdrop-blur"><ul className="grid grid-cols-4">{TABS.map(({ id, label, icon: Icon }) => <li key={id}><button type="button" onClick={() => setTab(id)} className={cn('flex w-full flex-col items-center gap-1 py-3 transition-colors', tab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground')} aria-current={tab === id ? 'page' : undefined}><Icon className="size-5" aria-hidden /><span className="font-display text-[11px] uppercase tracking-wide">{label}</span></button></li>)}</ul></nav>
    {clock.ringing && <AlarmRinger alarm={clock.ringing} onComplete={() => clock.completeAlarm(clock.ringing!)} onStartTimer={() => setTab('timer')} onDismiss={() => clock.dismissRinging(clock.ringing!.id)} />}
  </div>
}
