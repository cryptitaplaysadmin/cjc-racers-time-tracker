'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTIVITY_META } from '@/lib/types'
import { disablePush, enablePush, notificationsSupported, registerWorker, sendPushTest } from '@/lib/push-client'
import type { ActiveTimer, ActivityKind, Alarm, HistoryEntry } from '@/lib/types'

const KEYS = { history: 'cjc.history', timer: 'cjc.timer' } as const
export type AccountGroup = { id: string; accountName: string; code: string; playing: null | { deviceId: string; name: string; startedAt: number }; revision: number }
type Session = { deviceId: string; name: string; role: string }
function load<T>(key: string, fallback: T): T { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
function save(key: string, value: unknown) { try { window.localStorage.setItem(key, JSON.stringify(value)) } catch {} }
function uid() { return crypto.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}` }
function normalizeAlarm(value: Alarm & { scheduledAt?: string | number; scheduled_at?: string | number }): Alarm { const time = value.scheduledAt ?? value.scheduled_at; return { ...value, scheduledAt: typeof time === 'string' ? Date.parse(time) : Number(time), createdAt: Number(value.createdAt ?? Date.now()) } }
function apiError(payload: unknown, fallback: string) { return typeof payload === 'object' && payload && 'error' in payload && typeof payload.error === 'string' ? payload.error : fallback }

export function useRaceClock() {
  const [name, setName] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [group, setGroup] = useState<AccountGroup | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [connection, setConnection] = useState<'loading' | 'joined' | 'anonymous' | 'error'>('loading')
  const [connectionError, setConnectionError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [timer, setTimer] = useState<ActiveTimer>(null)
  const [ringing, setRinging] = useState<Alarm | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [pushState, setPushState] = useState<'idle' | 'enabled' | 'working' | 'unsupported' | 'error'>('idle')
  const [pushError, setPushError] = useState('')
  const refreshInFlight = useRef(false)
  const sessionVersion = useRef(0)
  const silencedAlarms = useRef(new Set<string>())

  const refreshSchedule = useCallback(async () => {
    if (refreshInFlight.current) return
    refreshInFlight.current = true
    const version = sessionVersion.current
    try {
      const response = await fetch('/api/alarms', { credentials: 'same-origin', cache: 'no-store' })
      if (version !== sessionVersion.current) return
      if (response.status === 401 || response.status === 403) { setConnection('anonymous'); setGroup(null); setSession(null); setAlarms([]); return }
      const payload = await response.json().catch(() => ({})) as { alarms?: Alarm[]; session?: Session; group?: AccountGroup; error?: string }
      if (version !== sessionVersion.current) return
      if (!response.ok) { setConnectionError(apiError(payload, 'Could not load the shared schedule.')); setConnection((current) => current === 'joined' ? current : 'error'); return }
      setAlarms((payload.alarms ?? []).map(normalizeAlarm))
      if (payload.session?.name) setName(payload.session.name)
      setSession(payload.session ?? null); setGroup(payload.group ?? null); setConnectionError('')
      setConnection('joined')
    } catch { if (version === sessionVersion.current) { setConnectionError('Could not reach the shared schedule. Check your connection and try again.'); setConnection((current) => current === 'joined' ? current : 'error') } }
    finally { refreshInFlight.current = false }
  }, [])

  useEffect(() => {
    setHistory(load<HistoryEntry[]>(KEYS.history, []).filter((entry) => Object.hasOwn(ACTIVITY_META, entry.activity)))
    const stored = load<ActiveTimer>(KEYS.timer, null)
    setTimer(stored && Object.hasOwn(ACTIVITY_META, stored.activity) ? stored : null)
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission)
    if (!notificationsSupported()) setPushState('unsupported'); else void registerWorker().catch(() => setPushState('unsupported'))
    setHydrated(true); void refreshSchedule()
  }, [refreshSchedule])
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  useEffect(() => { if (hydrated) save(KEYS.history, history) }, [history, hydrated])
  useEffect(() => { if (hydrated) save(KEYS.timer, timer) }, [timer, hydrated])
  useEffect(() => {
    if (!group) return
    silencedAlarms.current = new Set(load<string[]>(`cjc.silenced.${group.id}`, []))
    setRinging(null)
  }, [group?.id])
  useEffect(() => {
    if (connection !== 'joined' || !group || ringing) return
    const due = alarms.find((alarm) => (alarm.status === 'scheduled' || alarm.status === 'ringing') && alarm.scheduledAt <= now && now - alarm.scheduledAt <= 5 * 60_000 && !silencedAlarms.current.has(alarm.id))
    if (due) setRinging(due)
  }, [alarms, now, connection, group, ringing])
  useEffect(() => {
    const refresh = () => { setNow(Date.now()); if (document.visibilityState === 'visible') void refreshSchedule() }
    const online = () => void refreshSchedule()
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); window.addEventListener('online', online)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('online', online) }
  }, [refreshSchedule])
  useEffect(() => { if (connection !== 'joined') return; const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshSchedule() }, 15_000); return () => clearInterval(id) }, [connection, refreshSchedule])

  const enterGroup = useCallback(async (input: { action: 'create'; accountName: string; name: string } | { action: 'join'; joinCode: string; name: string }) => {
    setConnectionError('')
    const response = await fetch('/api/session', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const payload = await response.json().catch(() => ({})) as { session?: Session; group?: AccountGroup; error?: string }
    if (!response.ok) { const error = apiError(payload, 'Could not join the group.'); setConnectionError(error); throw new Error(error) }
    sessionVersion.current += 1
    setName(payload.session?.name ?? input.name); setSession(payload.session ?? null); setGroup(payload.group ?? null); setAlarms([]); setConnection('joined'); await refreshSchedule()
  }, [refreshSchedule])
  const join = useCallback((name: string, joinCode: string) => enterGroup({ action: 'join', name, joinCode }), [enterGroup])
  const createGroup = useCallback((accountName: string, name: string) => enterGroup({ action: 'create', accountName, name }), [enterGroup])
  const leaveGroup = useCallback(async () => {
    const response = await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' })
    if (!response.ok) throw new Error(apiError(await response.json().catch(() => ({})), 'Could not leave the group. Please try again.'))
    sessionVersion.current += 1
    setGroup(null); setSession(null); setName(''); setAlarms([]); setRinging(null); setConnection('anonymous'); setConnectionError(''); setPushState(notificationsSupported() ? 'idle' : 'unsupported')
    const registration = await navigator.serviceWorker?.getRegistration('/')
    await (await registration?.pushManager.getSubscription())?.unsubscribe().catch(() => {})
  }, [])
  const updatePlaying = useCallback(async (action: 'start' | 'stop' | 'takeover', revision: number) => {
    const response = await fetch('/api/group/playing', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, revision }) })
    const payload = await response.json().catch(() => ({})) as { group?: AccountGroup; error?: string }
    if (payload.group) setGroup(payload.group)
    if (response.status === 409) throw new Error('The playing status changed. Review the current player and try again.')
    if (!response.ok) throw new Error(apiError(payload, 'Could not update playing status.'))
  }, [])
  const addAlarm = useCallback(async (input: { activity: ActivityKind; label: string; scheduledAt: number }) => {
    const idempotencyKey = uid()
    const response = await fetch('/api/alarms', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify({ ...input, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, idempotencyKey }) })
    const payload = await response.json().catch(() => ({})) as { alarm?: Alarm; error?: string }
    if (!response.ok) throw new Error(apiError(payload, 'The alarm could not be scheduled.'))
    const created = payload.alarm
    if (created) setAlarms((previous) => [...previous.filter((alarm) => alarm.id !== created.id), normalizeAlarm(created)])
    void refreshSchedule()
  }, [refreshSchedule])
  const deleteAlarm = useCallback(async (id: string) => {
    const response = await fetch(`/api/alarms/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' })
    if (!response.ok) throw new Error(apiError(await response.json().catch(() => ({})), 'The alarm could not be cancelled.'))
    setAlarms((previous) => previous.filter((alarm) => alarm.id !== id))
  }, [])
  const requestNotifications = useCallback(async () => { setPushError(''); setPushState('working'); try { await enablePush(); setNotifPermission('granted'); setPushState('enabled') } catch (error) { setNotifPermission(typeof Notification === 'undefined' ? 'default' : Notification.permission); setPushError(error instanceof Error ? error.message : 'Could not enable notifications.'); setPushState('error') } }, [])
  const disableNotifications = useCallback(async () => { await disablePush(); setPushState('idle') }, [])
  const testNotifications = useCallback(async () => { setPushError(''); try { await sendPushTest() } catch (error) { setPushError(error instanceof Error ? error.message : 'Could not send a test notification.') } }, [])
  const dismissRinging = useCallback((id: string) => {
    silencedAlarms.current.add(id)
    if (group) save(`cjc.silenced.${group.id}`, [...silencedAlarms.current].slice(-500))
    setRinging((current) => current?.id === id ? null : current)
  }, [group])
  const completeAlarm = useCallback((alarm: Alarm) => { setHistory((previous) => [{ id: uid(), activity: alarm.activity, label: alarm.label, at: Date.now(), source: 'alarm' }, ...previous]); dismissRinging(alarm.id) }, [dismissRinging])
  const startTimer = useCallback((activity: ActivityKind, label: string) => setTimer({ activity, label, startedAt: Date.now() }), [])
  const stopTimer = useCallback(() => { if (!timer) return; setHistory((previous) => [{ id: uid(), activity: timer.activity, label: timer.label, at: Date.now(), durationMs: Date.now() - timer.startedAt, source: 'timer' }, ...previous]); setTimer(null) }, [timer])
  return { name, setName, session, group, createGroup, leaveGroup, updatePlaying, hydrated, now, alarms, history, timer, ringing, notifPermission, pushState, pushError, connection, connectionError, join, refreshSchedule, requestNotifications, disableNotifications, testNotifications, addAlarm, deleteAlarm, completeAlarm, dismissRinging, startTimer, stopTimer, cancelTimer: () => setTimer(null), clearHistory: () => setHistory([]) }
}
