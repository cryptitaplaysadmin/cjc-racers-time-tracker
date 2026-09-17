import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getConfig } from './config'
import type { Role, Session } from './models'

const COOKIE = 'cjc_session'
function sign(value: string) { return createHmac('sha256', getConfig().SESSION_SECRET).update(value).digest('base64url') }
export function makeSession(name: string, role: Role, groupId: string): Session {
  return { deviceId: crypto.randomUUID(), groupId, name, role, issuedAt: Date.now() }
}
export function encodeSession(session: Session) { const raw = Buffer.from(JSON.stringify(session)).toString('base64url'); return `${raw}.${sign(raw)}` }
export function decodeSession(value?: string): Session | null {
  if (!value) return null
  const [raw, signature] = value.split('.')
  if (!raw || !signature) return null
  const expected = sign(raw)
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const session = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Session
    if (!session || typeof session.deviceId !== 'string' || typeof session.groupId !== 'string' || typeof session.name !== 'string' || !['member', 'admin'].includes(session.role) || !Number.isFinite(session.issuedAt) || Date.now() - session.issuedAt > 90 * 86400_000) return null
    return session
  } catch { return null }
}
export async function currentSession() { return decodeSession((await cookies()).get(COOKIE)?.value) }
export function sessionCookie(value: string) { return { name: COOKIE, value, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 90 } }
export function clearSessionCookie() { return { ...sessionCookie(''), maxAge: 0 } }
