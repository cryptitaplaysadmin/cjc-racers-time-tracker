import { NextResponse } from 'next/server'
import { apiError, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { sendPush } from '@/lib/server/push'
export const runtime = 'nodejs'
export async function POST() {
  try { const session = await requireSession(); const subscription = (await store.subscriptions(session.groupId)).find(item => item.deviceId === session.deviceId); if (!subscription) return NextResponse.json({ error: 'Enable notifications on this device first.' }, { status: 409 }); await sendPush(subscription, JSON.stringify({ title: 'CJC Racers', body: 'Notifications are working on this device.', tag: `cjc-test:${session.deviceId}`, data: { url: '/' } }), 60); return NextResponse.json({ sent: true }) } catch (error) { return apiError(error, 503) }
}
