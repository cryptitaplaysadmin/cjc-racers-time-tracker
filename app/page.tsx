'use client'

import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, AlarmClockPlus, Timer, History } from 'lucide-react'
import { useRaceClock } from '@/hooks/use-race-clock'
import { RaceHeader } from '@/components/race-header'
import { CountdownHero } from '@/components/countdown-hero'
import { ScheduleList } from '@/components/schedule-list'
import { AlarmForm } from '@/components/alarm-form'
import { TimerPanel } from '@/components/timer-panel'
import { HistoryPanel } from '@/components/history-panel'
import { AlarmRinger } from '@/components/alarm-ringer'
import type { Alarm } from '@/lib/types'
import { makeShare } from '@/lib/share'
import { cn } from '@/lib/utils'

type Tab = 'dashboard' | 'alarm' | 'timer' | 'history'

const TABS: { id: Tab; label: string; icon: typeof Timer }[] = [
  { id: 'dashboard', label: 'Grid', icon: LayoutDashboard },
  { id: 'alarm', label: 'Alarm', icon: AlarmClockPlus },
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'history', label: 'History', icon: History },
]

export default function Page() {
  const clock = useRaceClock()
  const [shareLink, setShareLink] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')

  useEffect(() => setShareLink(''), [clock.alarms, clock.timer])

  const upcoming = useMemo(
    () => [...clock.alarms].sort((a, b) => a.scheduledAt - b.scheduledAt),
    [clock.alarms],
  )
  const nextAlarm = upcoming.find((a) => a.status !== 'ringing') ?? upcoming[0] ?? null

  const handleStartTimerFromAlarm = (a: Alarm) => {
    clock.startTimer(a.activity, a.label)
    clock.completeAlarm(a)
    setTab('timer')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pb-24">
      <RaceHeader
        now={clock.now}
        notifPermission={clock.notifPermission}
        onEnableNotifications={clock.requestNotifications}
      />

      <div className="mx-5 mb-5 space-y-3 rounded-xl border border-border p-4">
        {clock.shared ? <h1 className="text-lg font-semibold">{clock.name}'s shared timers</h1> : <>
          <label htmlFor="player-name" className="block text-sm">Your name</label>
          <input id="player-name" maxLength={80} value={clock.name} onChange={e => {clock.setName(e.target.value); setShareLink('')}} className="h-12 w-full rounded-xl border border-input bg-background px-3" placeholder="Enter your name" />
          <button disabled={!clock.name.trim() || !clock.hydrated} className="rounded-xl bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50" onClick={() => setShareLink(makeShare(clock.name, clock.alarms, clock.timer))}>Create shareable link</button>
          {shareLink && <><label htmlFor="share-link" className="block text-sm">Copy this link</label><input id="share-link" readOnly value={shareLink} onFocus={e => e.target.select()} className="w-full rounded border bg-background p-3" /><button onClick={() => navigator.clipboard.writeText(shareLink).catch(() => {})} className="underline">Copy link</button></>}
        </>}
        <p className="text-sm text-muted-foreground">Shared links are snapshots. Create a new link after changing timers. Each viewer must enable notifications and keep this page open. Background alerts may be delayed; closing the browser stops alerts.</p>
        {clock.shareError && <p role="alert">{clock.shareError}</p>}
        {clock.shared && <a href="/" className="block underline">Open my own timers</a>}
      </div>
      <main className="flex-1">
        {!clock.hydrated ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            Warming up the grid…
          </div>
        ) : tab === 'dashboard' ? (
          <div className="space-y-6">
            <CountdownHero
              alarm={nextAlarm}
              now={clock.now}
              onCreate={() => setTab('alarm')}
            />
            <div>
              <div className="mb-3 flex items-center gap-3 px-5">
                <h2 className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Schedule
                </h2>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ScheduleList
                readOnly={clock.shared}
                alarms={upcoming}
                now={clock.now}
                onComplete={clock.shared ? () => {} : clock.completeAlarm}
                onStartTimer={clock.shared ? () => {} : handleStartTimerFromAlarm}
                onDelete={clock.shared ? () => {} : clock.deleteAlarm}
              />
            </div>
          </div>
        ) : tab === 'alarm' ? (
          <AlarmForm
            onFarm={label => { clock.startTimer('farming', label); setTab('timer') }}
            onAdd={(input) => {
              clock.addAlarm(input)
              setTab('dashboard')
            }}
          />
        ) : tab === 'timer' ? (
          <TimerPanel
            readOnly={clock.shared}
            timer={clock.timer}
            now={clock.now}
            onStart={clock.startTimer}
            onStop={clock.stopTimer}
            onCancel={clock.cancelTimer}
          />
        ) : (
          <HistoryPanel history={clock.history} onClear={clock.clearHistory} />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/90 backdrop-blur">
        <ul className="grid grid-cols-4">
          {TABS.filter(t => !clock.shared || t.id === 'dashboard' || t.id === 'timer').map(({ id, label, icon: Icon }) => {
            const active = tab === id
            const showDot =
              (id === 'timer' && clock.timer) ||
              (id === 'dashboard' && upcoming.some((a) => a.status === 'ringing'))
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 py-3 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    {showDot && (
                      <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-accent" />
                    )}
                  </span>
                  <span className="font-display text-[11px] uppercase tracking-wide">
                    {label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {clock.ringing && (
        <AlarmRinger
          alarm={clock.ringing}
          onComplete={() => clock.completeAlarm(clock.ringing!)}
          onStartTimer={() => { if (!clock.shared) handleStartTimerFromAlarm(clock.ringing!) }}
          onDismiss={() => clock.dismissRinging(clock.ringing!.id)}
        />
      )}
    </div>
  )
}
