import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { payload, sendPush } from '@/lib/server/push'
import { verifyJobSignature } from '@/lib/server/scheduler'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    if (!(await verifyJobSignature(raw, request.headers.get('upstash-signature')))) return NextResponse.json({ error: 'Invalid job signature.' }, { status: 401 })
    const body = JSON.parse(raw) as { alarmId?: string; revision?: number; kind?: 'warning' | 'start' }
    if (!body.alarmId || !body.kind || !Number.isInteger(body.revision)) return NextResponse.json({ error: 'Invalid dispatch payload.' }, { status: 400 })
    const revision = body.revision as number
    const [alarm, dispatch] = await Promise.all([store.alarm(body.alarmId), store.dispatch(body.alarmId, revision, body.kind)])
    if (!alarm || !dispatch || alarm.status !== 'scheduled' || alarm.revision !== revision || dispatch.state === 'cancelled') return NextResponse.json({ skipped: true })
    if (body.kind === 'warning' && Date.now() >= alarm.scheduledAt) return NextResponse.json({ skipped: true, expired: true })
    const subscriptions = await store.subscriptions(alarm.groupId); const ttl = body.kind === 'warning' ? Math.max(0, Math.floor((alarm.scheduledAt - Date.now()) / 1000)) : 300
    const outcomes = await Promise.allSettled(subscriptions.map(item => sendPush(item, payload(alarm, body.kind!), ttl)))
    await store.saveDispatch({ ...dispatch, state: 'sent' })
    return NextResponse.json({ accepted: outcomes.filter(item => item.status === 'fulfilled').length, failed: outcomes.filter(item => item.status === 'rejected').length })
  } catch (error) { return apiError(error, 500) }
}
