import 'server-only'
import { getConfig } from './config'
import type { Dispatch, PushSubscriptionRecord, SharedAlarm } from './models'

type RedisReply<T> = { result?: T; error?: string }
const prefix = () => `cjc:${getConfig().APP_ENV}:`
async function redis<T>(command: (string | number)[]): Promise<T> {
  const config = getConfig()
  const response = await fetch(config.UPSTASH_REDIS_REST_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Store request failed (${response.status})`)
  const reply = await response.json() as RedisReply<T>
  if (reply.error) throw new Error(`Store error: ${reply.error}`)
  return reply.result as T
}
const json = <T>(value: string | null): T | null => value ? JSON.parse(value) as T : null
const alarmKey = (id: string) => `${prefix()}alarm:${id}`
const dispatchKey = (alarmId: string, revision: number, kind: string) => `${prefix()}dispatch:${alarmId}:${revision}:${kind}`

export const store = {
  async alarms(groupId: string) {
    const ids = await redis<string[]>(['ZRANGE', `${prefix()}alarms:${groupId}`, 0, -1])
    const records = await Promise.all(ids.map(async id => json<SharedAlarm>(await redis<string | null>(['GET', alarmKey(id)]))))
    return records.filter((record): record is SharedAlarm => record !== null).sort((a, b) => a.scheduledAt - b.scheduledAt)
  },
  async alarm(id: string) { return json<SharedAlarm>(await redis<string | null>(['GET', alarmKey(id)])) },
  async saveAlarm(alarm: SharedAlarm) {
    await redis(['SET', alarmKey(alarm.id), JSON.stringify(alarm), 'EX', 60 * 60 * 24 * 31])
    await redis(['ZADD', `${prefix()}alarms:${alarm.groupId}`, alarm.scheduledAt, alarm.id])
  },
  async subscriptions(groupId: string) {
    const ids = await redis<string[]>(['SMEMBERS', `${prefix()}subscriptions:${groupId}`])
    const records = await Promise.all(
      ids.map(async (id) =>
        json<PushSubscriptionRecord>(
          await redis<string | null>(['GET', `${prefix()}subscription:${id}`]),
        ),
      ),
    )
    return records.filter((record): record is PushSubscriptionRecord => record?.enabled === true)
  },
  async saveSubscription(subscription: PushSubscriptionRecord) {
    await redis(['SET', `${prefix()}subscription:${subscription.deviceId}`, JSON.stringify(subscription), 'EX', 60 * 60 * 24 * 180])
    await redis(['SADD', `${prefix()}subscriptions:${subscription.groupId}`, subscription.deviceId])
  },
  async disableSubscription(groupId: string, deviceId: string) {
    const key = `${prefix()}subscription:${deviceId}`
    const existing = json<PushSubscriptionRecord>(await redis<string | null>(['GET', key]))
    if (existing) await redis(['SET', key, JSON.stringify({ ...existing, enabled: false, updatedAt: Date.now() }), 'EX', 60 * 60 * 24 * 30])
    await redis(['SREM', `${prefix()}subscriptions:${groupId}`, deviceId])
  },
  async saveDispatch(dispatch: Dispatch) { await redis(['SET', dispatchKey(dispatch.alarmId, dispatch.revision, dispatch.kind), JSON.stringify(dispatch), 'EX', 60 * 60 * 24 * 31]) },
  async dispatch(alarmId: string, revision: number, kind: string) { return json<Dispatch>(await redis<string | null>(['GET', dispatchKey(alarmId, revision, kind)])) },
}
