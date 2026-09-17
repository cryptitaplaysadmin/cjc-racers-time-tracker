'use client'

type PushConfig = { publicKey?: string; vapidPublicKey?: string; ready?: boolean }

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
  if (!config.ready || !publicKey) throw new Error('Global notifications are not configured yet.')

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
  await fetch('/api/push/subscriptions', { method: 'DELETE', credentials: 'same-origin' }).catch(() => {})
  await subscription?.unsubscribe().catch(() => {})
}

export async function sendPushTest() {
  const response = await fetch('/api/push/test', { method: 'POST', credentials: 'same-origin' })
  if (!response.ok) throw new Error((await response.json().catch(() => ({})) as { error?: string }).error ?? 'Could not send a test notification.')
}
