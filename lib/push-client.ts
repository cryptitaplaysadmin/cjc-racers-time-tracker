'use client'

import type { Alarm } from './types'
import { alarmEventId } from './alarm-events'

type PushConfig = { publicKey?: string; vapidPublicKey?: string; ready?: boolean; missing?: string[] }

function base64UrlToUint8Array(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

export function notificationsSupported() {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
}

export async function registerWorker() {
  if (!notificationsSupported()) throw new Error('This browser does not support web push notifications.')
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  return navigator.serviceWorker.ready.then(() => registration)
}

export async function enablePush() {
  if (!notificationsSupported()) throw new Error('This browser does not support web push notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications were not allowed on this device.')

  const registration = await registerWorker()
  const configResponse = await fetch('/api/push/config', { credentials: 'same-origin', cache: 'no-store' })
  if (!configResponse.ok) throw new Error('Global notifications are not configured yet.')
  const config = await configResponse.json() as PushConfig
  const publicKey = config.publicKey ?? config.vapidPublicKey
  if (!config.ready || !publicKey) throw new Error(`Global notifications are not configured yet.${config.missing?.length ? ` Missing settings: ${config.missing.join(', ')}.` : ''}`)

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  })
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(subscription),
  })
  if (!response.ok) {
    await subscription.unsubscribe().catch(() => {})
    throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? 'Could not save this device for global notifications.')
  }
  return subscription
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  const response = await fetch('/api/push/subscriptions', { method: 'DELETE', credentials: 'same-origin' })
  if (!response.ok) throw new Error('Could not disable notifications. Please retry.')
  await subscription?.unsubscribe()
}

export async function restorePush() {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const registration = await registerWorker()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false
  const response = await fetch('/api/push/subscriptions', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription) })
  if (!response.ok) throw new Error('Could not reconnect this device for notifications. Try Enable notifications again.')
  return true
}

export async function sendPushTest() {
  const response = await fetch('/api/push/test', { method: 'POST', credentials: 'same-origin' })
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? 'Could not send a test notification.')
}

export async function notifyDueAlarm(alarm: Alarm) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const registration = await registerWorker()
  const worker = registration.active
  if (!worker) throw new Error('Notifications are still starting. Refresh and try again.')
  const eventId = alarmEventId(alarm)
  const payload = { eventId, tag: eventId, title: alarm.activity === 'farming' ? 'CJC Racers — harvest ready' : 'CJC Racers — alarm', body: alarm.label, expiresAt: alarm.scheduledAt + 300_000, url: '/', data: { alarmId: alarm.id } }
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Browser notification timed out.')) }, 5000)
    channel.port1.onmessage = (event) => { clearTimeout(timeout); channel.port1.close(); event.data?.error ? reject(new Error(event.data.error)) : resolve() }
    worker.postMessage({ type: 'CJC_ALARM', payload }, [channel.port2])
  })
}
