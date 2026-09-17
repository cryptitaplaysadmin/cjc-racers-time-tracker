'use client'

import { useState } from 'react'
import { previewRingtone, stopRingtone } from '@/lib/alarm-audio'

export function AlarmControls({ onEnableNotifications }: { onEnableNotifications: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const enable = () => {
    // Begin both permission-sensitive operations before awaiting either one.
    void previewRingtone().then(() => setMessage('Ringtone tested. Keep sound enabled on this device.')).catch(() => setMessage('Sound was blocked. Check site sound permissions, then try again.'))
    void onEnableNotifications()
  }
  return <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
    <button type="button" onClick={enable} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Enable sound & notifications</button>
    <button type="button" onClick={() => { stopRingtone(); setMessage('Sound test stopped.') }} className="ml-3 underline">Stop sound test</button>
    {message && <p role="status">{message}</p>}
    <p className="text-xs text-muted-foreground">Your music plays while this page can run. When the phone suspends the app, push notifications use the device’s notification sound.</p>
  </div>
}
