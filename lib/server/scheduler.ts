import 'server-only'
import { Client, Receiver } from '@upstash/qstash'
import { getConfig } from './config'
import type { Dispatch, DispatchKind, SharedAlarm } from './models'
import { store } from './store'

export async function scheduleAlarm(alarm: SharedAlarm) {
  const events: Array<[DispatchKind, number]> = [['warning', alarm.scheduledAt - 60_000], ['start', alarm.scheduledAt]]
  for (const [kind, dueAt] of events) {
    if (kind === 'warning' && dueAt <= Date.now()) continue
    const dispatch: Dispatch = { alarmId: alarm.id, revision: alarm.revision, kind, dueAt, state: 'pending' }
    await store.saveDispatch(dispatch)
    const config = getConfig()
    const url = new URL('/api/jobs/dispatch', config.APP_ORIGIN).toString()
    const client = new Client({ token: config.QSTASH_TOKEN, baseUrl: config.QSTASH_URL, enableTelemetry: false })
    const queued = await client.publishJSON({ url, notBefore: Math.ceil(dueAt / 1000), retries: 3,
      deduplicationId: `${config.APP_ENV}:${alarm.id}:${alarm.revision}:${kind}`,
      body: { alarmId: alarm.id, revision: alarm.revision, kind } })
    await store.saveDispatch({ ...dispatch, state: 'scheduled', messageId: queued.messageId })
  }
}

export async function verifyJobSignature(raw: string, signature: string | null) {
  if (!signature) return false
  const config = getConfig()
  const receiver = new Receiver({ currentSigningKey: config.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: config.QSTASH_NEXT_SIGNING_KEY })
  try {
    return await receiver.verify({ signature, body: raw })
  } catch {
    return false
  }
}
