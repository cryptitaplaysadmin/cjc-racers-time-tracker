import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, encodeSession, makeSession, sessionCookie } from '@/lib/server/auth'
import { getConfig } from '@/lib/server/config'
import { apiError } from '@/lib/server/http'
import { cleanName } from '@/lib/server/validation'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: unknown; joinCode?: unknown; adminCode?: unknown }
    const config = getConfig()
    const role = body.adminCode === config.ADMIN_ACCESS_CODE ? 'admin' : 'member'
    if (role === 'member' && body.joinCode !== config.GROUP_JOIN_CODE) return NextResponse.json({ error: 'Invalid group code.' }, { status: 401 })
    const session = makeSession(cleanName(body.name), role)
    const response = NextResponse.json({ session: { deviceId: session.deviceId, name: session.name, role: session.role } })
    response.cookies.set(sessionCookie(encodeSession(session)))
    return response
  } catch (error) { return apiError(error) }
}
export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set(clearSessionCookie()); return response }
