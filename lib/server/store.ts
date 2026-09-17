import 'server-only'
import { getConfig } from './config'
import { createHash } from 'node:crypto'
import type { AccountGroup, Dispatch, PushSubscriptionRecord, SharedAlarm } from './models'

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
  async group(id: string) { return json<AccountGroup>(await redis<string | null>(['GET', `${prefix()}group:${id}`])) },
  async groupByCode(code: string): Promise<AccountGroup | null> {
    const id = await redis<string | null>(['GET', `${prefix()}group-code:${code}`])
    return id ? this.group(id) : null
  },
  async createGroup(group: AccountGroup) {
    const script = `if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end redis.call('SET', KEYS[1], ARGV[1]) redis.call('SET', KEYS[2], ARGV[2]) return 1`
    return (await redis<number>(['EVAL', script, 2, `${prefix()}group-code:${group.code}`, `${prefix()}group:${group.id}`, group.id, JSON.stringify(group)])) === 1
  },
  async compareAndSetGroup(previous: AccountGroup, next: AccountGroup) {
    const script = `local raw = redis.call('GET', KEYS[1]) if not raw then return 0 end local current = cjson.decode(raw) if current.revision ~= tonumber(ARGV[1]) then return 0 end redis.call('SET', KEYS[1], ARGV[2]) return 1`
    return (await redis<number>(['EVAL', script, 1, `${prefix()}group:${previous.id}`, previous.revision, JSON.stringify(next)])) === 1
  },
  async alarms(groupId: string) {
    const ids = await redis<string[]>(['ZRANGE', `${prefix()}alarms:${groupId}`, 0, -1])
    const records = await Promise.all(ids.map(async id => json<SharedAlarm>(await redis<string | null>(['GET', alarmKey(id)]))))
    return records.filter((record): record is SharedAlarm => record !== null && record.groupId === groupId).sort((a, b) => a.scheduledAt - b.scheduledAt)
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
    return records.filter((record): record is PushSubscriptionRecord => record?.enabled === true && record.groupId === groupId)
  },
  async saveSubscription(subscription: PushSubscriptionRecord) {
    const endpointKey = `${prefix()}push-endpoint:${createHash('sha256').update(subscription.endpoint).digest('hex')}`
    const script = `local oldId = redis.call('GET', KEYS[1])
      if oldId then local oldRaw = redis.call('GET', ARGV[1] .. 'subscription:' .. oldId)
        if oldRaw then local old = cjson.decode(oldRaw) local incoming = cjson.decode(ARGV[3]) if old.endpoint == incoming.endpoint then redis.call('SREM', ARGV[1] .. 'subscriptions:' .. old.groupId, oldId) redis.call('DEL', ARGV[1] .. 'subscription:' .. oldId) end end end
      redis.call('SET', KEYS[1], ARGV[2], 'EX', 15552000)
      redis.call('SET', KEYS[2], ARGV[3], 'EX', 15552000)
      redis.call('SADD', KEYS[3], ARGV[2]) return 1`
    await redis(['EVAL', script, 3, endpointKey, `${prefix()}subscription:${subscription.deviceId}`, `${prefix()}subscriptions:${subscription.groupId}`, prefix(), subscription.deviceId, JSON.stringify(subscription)])
  },
  async disableSubscription(groupId: string, deviceId: string) {
    const key = `${prefix()}subscription:${deviceId}`
    const existing = json<PushSubscriptionRecord>(await redis<string | null>(['GET', key]))
    if (existing?.groupId === groupId) await redis(['SET', key, JSON.stringify({ ...existing, enabled: false, updatedAt: Date.now() }), 'EX', 60 * 60 * 24 * 30])
    await redis(['SREM', `${prefix()}subscriptions:${groupId}`, deviceId])
  },
  async saveDispatch(dispatch: Dispatch) { await redis(['SET', dispatchKey(dispatch.alarmId, dispatch.revision, dispatch.kind), JSON.stringify(dispatch), 'EX', 60 * 60 * 24 * 31]) },
  async dispatch(alarmId: string, revision: number, kind: string) { return json<Dispatch>(await redis<string | null>(['GET', dispatchKey(alarmId, revision, kind)])) },
}
