'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { formatClock } from '@/lib/time'

export function RaceHeader({
  now,
  notifPermission,
  pushState = 'idle',
  pushError = '',
  onEnableNotifications,
}: {
  now: number
  notifPermission: NotificationPermission
  pushState?: 'idle' | 'enabled' | 'working' | 'unsupported' | 'error'
  pushError?: string
  onEnableNotifications: () => void
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-6 pb-3">
      <div className="flex items-center gap-3">
        <div
          className="checkered size-9 rounded-md text-foreground/90"
          aria-hidden
        />
        <div className="leading-none">
          <p className="font-display text-xl font-bold uppercase tracking-tight">
            <span className="text-primary">CJC</span> Racers
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Race Clock
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-display tabular text-lg text-foreground/90">
          {mounted ? formatClock(now) : '--:-- --'}
        </p>
        {pushState === 'enabled' ? (
          <span
            className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent"
            title="Global notifications enabled on this device"
          >
            <Bell className="size-4" aria-hidden />
            <span className="sr-only">Global notifications enabled</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={onEnableNotifications}
            disabled={pushState === 'working' || pushState === 'unsupported'}
            className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            title={pushError || (pushState === 'unsupported' ? 'Web push is not supported by this browser' : notifPermission === 'denied' ? 'Notifications are blocked in browser settings' : 'Enable global notifications')}
          >
            <BellOff className="size-4" aria-hidden />
            <span className="sr-only">Enable notifications</span>
          </button>
        )}
      </div>
    </header>
  )
}
