import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { payload, sendPush } from '@/lib/server/push'
import { verifyJobSignature } from '@/lib/server/scheduler'
import { dispatchDecision } from '@/lib/server/dispatch'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    if (!(await verifyJobSignature(raw, request.headers.get('upstash-signature')))) return NextResponse.json({ error: 'Invalid job signature.' }, { status: 401 })
    const body = JSON.parse(raw) as { alarmId?: string; revision?: number; kind?: 'warning' | 'start' }
    if (typeof body.alarmId !== 'string' || !body.alarmId || (body.kind !== 'warning' && body.kind !== 'start') || !Number.isInteger(body.revision)) return NextResponse.json({ error: 'Invalid dispatch payload.' }, { status: 400 })
    const revision = body.revision as number
    const [alarm, dispatch] = await Promise.all([store.alarm(body.alarmId), store.dispatch(body.alarmId, revision, body.kind)])
    const decision = dispatchDecision(alarm, dispatch, revision, body.kind)
    if (decision === 'skip' || !alarm || !dispatch) return NextResponse.json({ skipped: true })
    if (decision === 'retry') return NextResponse.json({ error: 'Alarm not ready for dispatch. Retry shortly.' }, { status: 503 })
    if (!(await store.group(alarm.groupId))) return NextResponse.json({ skipped: true, reason: 'Group no longer exists.' })
    const eventId = `${alarm.id}:${revision}:${body.kind}`
    const lockToken = crypto.randomUUID()
    if (!(await store.lockDispatch(eventId, lockToken))) return NextResponse.json({ error: 'Dispatch is already running.' }, { status: 503 })
    try {
      const current = await store.dispatch(alarm.id, revision, body.kind)
      if (current?.state === 'sent') return NextResponse.json({ skipped: true })
      const subscriptions = await store.subscriptions(alarm.groupId)
      const expiresAt = body.kind === 'warning' ? alarm.scheduledAt : alarm.scheduledAt + 300_000
      const ttl = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      const outcomes = await Promise.allSettled(subscriptions.map(async item => {
        if (await store.delivered(eventId, item.deviceId)) return
        try { await sendPush(item, payload(alarm, body.kind!), ttl); await store.markDelivered(eventId, item.deviceId) }
        catch (error) {
          const status = (error as { statusCode?: number })?.statusCode
          if (status === 404 || status === 410) { await store.disableSubscription(item.groupId, item.deviceId); return }
          throw error
        }
      }))
      const failed = outcomes.filter(item => item.status === 'rejected').length
      await store.saveDispatch({ ...dispatch, state: failed ? 'failed' : 'sent' })
      return NextResponse.json({ accepted: outcomes.length - failed, failed, ...(failed ? { error: 'Some push deliveries failed; scheduler will retry.' } : {}) }, { status: failed ? 503 : 200 })
    } finally { await store.unlockDispatch(eventId, lockToken) }
  } catch (error) { return apiError(error, 500) }
}
