'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTIVITY_META } from '@/lib/types'
import { readShare } from '@/lib/share'
import type { ActiveTimer, ActivityKind, Alarm, HistoryEntry } from '@/lib/types'

const KEYS = {
  alarms: 'cjc.alarms',
  history: 'cjc.history',
  timer: 'cjc.timer',
} as const

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full / unavailable — ignore for MVP
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Short race-buzzer beep via Web Audio (no asset needed).
function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[0, 0.28, 0.56].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, now + offset)
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.24)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch {
    // audio unavailable — silent fail
  }
}

// Show a notification. Prefers the service worker registration (works on
// mobile and when the tab is backgrounded), falling back to the direct
// constructor on desktop browsers that support it.
function notify(
  reg: ServiceWorkerRegistration | null,
  title: string,
  body: string,
  tag: string,
) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const options: NotificationOptions = { body, tag }
  try {
    if (reg) {
      void reg.showNotification(title, { ...options, data: {url: window.location.href}, vibrate: [200, 100, 200] } as NotificationOptions).catch(() => {})
      return
    }
    new Notification(title, options)
  } catch {
    // notification failed — in-app ringer still shows
  }
}

export function useRaceClock() {
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const [shareError, setShareError] = useState('')
  const sharedKey = useRef('')
  const [hydrated, setHydrated] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [timer, setTimer] = useState<ActiveTimer>(null)
  const [ringing, setRinging] = useState<Alarm | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')

  const firedRef = useRef<Set<string>>(new Set())
  const swRef = useRef<ServiceWorkerRegistration | null>(null)

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const valid = (a: {activity: ActivityKind}) => a && Object.hasOwn(ACTIVITY_META, a.activity)
    try {
      const snapshot = readShare(window.location.hash)
      if (snapshot) {
        setShared(true)
        sharedKey.current = 'cjc.shared.' + window.location.hash
        const fired = load<string[]>(sharedKey.current, [])
        firedRef.current = new Set(fired)
        setName(snapshot.name)
        setAlarms(snapshot.alarms.map(a => ({...a, warned: fired.includes(a.id + ':warning'), status: fired.includes(a.id) ? 'done' : 'pending'})))
        setTimer(snapshot.timer)
      } else {
        setName(load<string>('cjc.name', ''))
        setAlarms(load<Alarm[]>(KEYS.alarms, []).filter(valid))
        setHistory(load<HistoryEntry[]>(KEYS.history, []).filter(valid))
        const stored = load<ActiveTimer>(KEYS.timer, null)
        setTimer(stored && valid(stored) ? stored : null)
      }
    } catch {
      setShared(true)
      setShareError('This shared link is invalid. Ask the owner for a new link.')
    }
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)
    setHydrated(true)
  }, [])

  // Register the service worker — required for notifications on mobile,
  // where `new Notification()` is unsupported and throws.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        swRef.current = reg
      })
      .catch(() => {
        // registration failed — desktop `new Notification()` fallback still applies
      })
  }, [])

  // Ticking clock — single source of truth for all countdowns.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Persist.
  useEffect(() => {
    if (hydrated && !shared) save(KEYS.alarms, alarms)
  }, [alarms, hydrated, shared])
  useEffect(() => {
    if (hydrated && !shared) save(KEYS.history, history)
  }, [history, hydrated, shared])
  useEffect(() => {
    if (hydrated && !shared) save(KEYS.timer, timer)
  }, [timer, hydrated, shared])

  useEffect(() => { if (hydrated && !shared) save('cjc.name', name) }, [name, hydrated, shared])

  // Use absolute timestamps and recheck immediately when the page resumes.
  useEffect(() => {
    const resume = () => setNow(Date.now())
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => { window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume) }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    for (const a of alarms) {
      if (a.status !== 'pending' || a.warned || a.scheduledAt <= now || a.scheduledAt - now > 60000) continue
      const tag = a.id + ':warning'
      if (firedRef.current.has(tag)) continue
      firedRef.current.add(tag)
      if (shared) save(sharedKey.current, [...firedRef.current])
      setAlarms(prev => prev.map(item => item.id === a.id ? {...item, warned: true} : item))
      playBeep()
      notify(swRef.current, `${name || 'CJC Racers'} · Starting soon`, `${a.label} — starts in one minute or less.`, tag)
    }
  }, [now, alarms, hydrated, name, shared])

  // Fire alarms whose time has arrived.
  useEffect(() => {
    if (!hydrated) return
    const due = alarms.find(
      (a) => a.status === 'pending' && a.scheduledAt <= now && !firedRef.current.has(a.id),
    )
    if (!due) return
    firedRef.current.add(due.id)
    if (shared) save(sharedKey.current, [...firedRef.current])
    setAlarms((prev) =>
      prev.map((a) => (a.id === due.id ? { ...a, status: 'ringing' } : a)),
    )
    setRinging(current => current ?? due)
    playBeep()
    notify(swRef.current, `${name || 'CJC Racers'} · Alarm`, `${due.label} — it's go time!`, due.id)
  }, [now, alarms, hydrated, name, shared])

  useEffect(() => {
    if (hydrated && !ringing) setRinging(alarms.find(a => a.status === 'ringing') ?? null)
  }, [alarms, ringing, hydrated])

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    try {
      const res = await Notification.requestPermission()
      setNotifPermission(res)
    } catch {
      // ignore
    }
  }, [])

  const addAlarm = useCallback(
    (input: { activity: ActivityKind; label: string; scheduledAt: number }) => {
      const alarm: Alarm = {
        id: uid(),
        activity: input.activity,
        label: input.label,
        scheduledAt: input.scheduledAt,
        status: 'pending',
        createdAt: Date.now(),
      }
      setAlarms((prev) => [...prev, alarm])
      if (notifPermission === 'default') void requestNotifications()
    },
    [notifPermission, requestNotifications],
  )

  const deleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Complete an alarm: log it to history and remove from active list.
  const completeAlarm = useCallback((alarm: Alarm) => {
    setHistory((prev) => [
      {
        id: uid(),
        activity: alarm.activity,
        label: alarm.label,
        at: Date.now(),
        source: 'alarm',
      },
      ...prev,
    ])
    setAlarms((prev) => prev.filter((a) => a.id !== alarm.id))
    setRinging((r) => (r?.id === alarm.id ? null : r))
  }, [])

  const dismissRinging = useCallback((id: string) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'dismissed' } : a)))
    setAlarms((prev) => prev.filter((a) => a.id !== id))
    setRinging((r) => (r?.id === id ? null : r))
  }, [])

  const startTimer = useCallback((activity: ActivityKind, label: string) => {
    setTimer({ activity, label, startedAt: Date.now() })
  }, [])

  const stopTimer = useCallback(() => {
    if (!timer) return
    setHistory(prev => [{id: uid(), activity: timer.activity, label: timer.label, at: Date.now(), durationMs: Date.now() - timer.startedAt, source: 'timer'}, ...prev])
    setTimer(null)
  }, [timer])

  const cancelTimer = useCallback(() => setTimer(null), [])

  const clearHistory = useCallback(() => setHistory([]), [])

  return {
    name, setName, shared, shareError,
    hydrated,
    now,
    alarms,
    history,
    timer,
    ringing,
    notifPermission,
    requestNotifications,
    addAlarm,
    deleteAlarm,
    completeAlarm,
    dismissRinging,
    startTimer,
    stopTimer,
    cancelTimer,
    clearHistory,
  }
}
