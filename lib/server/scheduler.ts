import 'server-only'
import { Receiver } from '@upstash/qstash'
import { getConfig } from './config'
import type { Dispatch, DispatchKind, SharedAlarm } from './models'
import { store } from './store'

export async function scheduleAlarm(alarm: SharedAlarm) {
  const events: Array<[DispatchKind, number]> = [['warning', alarm.scheduledAt - 60_000], ['start', alarm.scheduledAt]]
  for (const [kind, dueAt] of events) {
    if (dueAt <= Date.now()) continue
    const dispatch: Dispatch = { alarmId: alarm.id, revision: alarm.revision, kind, dueAt, state: 'pending' }
    await store.saveDispatch(dispatch)
    const config = getConfig()
    const url = new URL('/api/jobs/dispatch', config.APP_ORIGIN).toString()
    const response = await fetch('https://qstash.upstash.io/v2/publish/' + encodeURIComponent(url), {
      method: 'POST', headers: { Authorization: `Bearer ${config.QSTASH_TOKEN}`, 'Content-Type': 'application/json', 'Upstash-Delay': `${Math.max(1, Math.ceil((dueAt - Date.now()) / 1000))}s` },
      body: JSON.stringify({ alarmId: alarm.id, revision: alarm.revision, kind }),
    })
    if (!response.ok) throw new Error(`Scheduler rejected ${kind} dispatch (${response.status})`)
    const queued = await response.json() as { messageId?: string }
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
