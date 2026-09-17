import 'server-only'

const required = [
  'APP_ORIGIN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'QSTASH_TOKEN', 'QSTASH_CURRENT_SIGNING_KEY', 'QSTASH_NEXT_SIGNING_KEY',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'SESSION_SECRET',
] as const

export type ConfigKey = (typeof required)[number]
export type AppConfig = Record<ConfigKey, string> & { APP_ENV: string; QSTASH_URL: string }

export function missingConfig(): ConfigKey[] {
  return required.filter((key) => !process.env[key]?.trim())
}

export function getConfig(keys: readonly ConfigKey[] = required): AppConfig {
  const missing = keys.filter(key => !process.env[key]?.trim())
  if (missing.length) throw new Error(`Global alarms are not configured. Missing: ${missing.join(', ')}`)
  return {
    APP_ORIGIN: process.env.APP_ORIGIN!, UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL!,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN!, QSTASH_TOKEN: process.env.QSTASH_TOKEN!,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY!, QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY!,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT!, SESSION_SECRET: process.env.SESSION_SECRET!,
    APP_ENV: process.env.APP_ENV || 'development',
    QSTASH_URL: (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, ''),
  }
}

export function publicReadiness() {
  const missing = missingConfig()
  return { ready: missing.length === 0, missing }
}
