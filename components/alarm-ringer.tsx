'use client'

import { useEffect } from 'react'
import { AlarmClock, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityBadge } from '@/components/activity-badge'
import { ACTIVITY_META, type Alarm } from '@/lib/types'
import { formatClock } from '@/lib/time'

export function AlarmRinger({
  alarm,
  onComplete,
  onStartTimer,
  onDismiss,
}: {
  alarm: Alarm
  onComplete: () => void
  onStartTimer: () => void
  onDismiss: () => void
}) {
  const meta = ACTIVITY_META[alarm.activity]
  useEffect(() => {
    const audio = new Audio('/alarm-ringtone.mp3')
    audio.loop = true
    audio.play().catch(() => {})
    return () => { audio.pause(); audio.currentTime = 0 }
  }, [alarm.id])
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-6 text-center"
      style={{
        background: `radial-gradient(ellipse at center, color-mix(in oklch, ${meta.colorVar} 22%, oklch(0.12 0.03 260)), oklch(0.1 0.03 260))`,
      }}
      role="alertdialog"
      aria-label="Alarm ringing"
    >
      <div
        className="flex size-28 animate-pulse-ring items-center justify-center rounded-full"
        style={{
          backgroundColor: `color-mix(in oklch, ${meta.colorVar} 20%, transparent)`,
          boxShadow: `0 0 60px color-mix(in oklch, ${meta.colorVar} 55%, transparent)`,
        }}
      >
        <AlarmClock className="size-14" style={{ color: meta.colorVar }} aria-hidden />
      </div>

      <div className="space-y-3">
        <ActivityBadge activity={alarm.activity} />
        <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-balance">
          {alarm.label}
        </h2>
        <p className="font-display tabular text-lg text-muted-foreground">
          Scheduled for {formatClock(alarm.scheduledAt)}
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="h-12 flex-1 font-display uppercase tracking-wide"
            onClick={onComplete}
          >
            <Check className="size-4" aria-hidden />
            Done
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 flex-1 font-display uppercase tracking-wide text-muted-foreground"
            onClick={onDismiss}
          >
            <X className="size-4" aria-hidden />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}
