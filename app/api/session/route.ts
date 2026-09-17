import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { clearSessionCookie, currentSession, encodeSession, makeSession, sessionCookie } from '@/lib/server/auth'
import { apiError, requireSameOrigin, requireSession, sessionView } from '@/lib/server/http'
import { cleanName } from '@/lib/server/validation'
import { cleanAccountName, generateGroupCode, normalizeGroupCode } from '@/lib/server/groups'
import { store } from '@/lib/server/store'
import type { AccountGroup } from '@/lib/server/models'
import { ApiError } from '@/lib/server/errors'
export const runtime = 'nodejs'

export async function GET() {
  try { const session = await requireSession(); return NextResponse.json({ session: sessionView(session), group: await store.group(session.groupId) }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { return apiError(error, 401) }
}
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    const body = await request.json() as Record<string, unknown>
    const name = cleanName(body.name)
    let group: AccountGroup | null = null
    if (body.action === 'create') {
      const accountName = cleanAccountName(body.accountName)
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate: AccountGroup = { id: randomUUID(), accountName, code: generateGroupCode(), playing: null, revision: 0, createdAt: Date.now() }
        if (await store.createGroup(candidate)) { group = candidate; break }
      }
      if (!group) throw new Error('Could not generate a group code. Please try again.')
    } else if (body.action === 'join') {
      group = await store.groupByCode(normalizeGroupCode(body.joinCode))
      if (!group) return NextResponse.json({ error: 'Group code not found. Check the code with the account group creator.' }, { status: 404 })
    } else throw new ApiError('Choose create or join.', 400)
    const previous = await currentSession()
    if (previous) await store.disableSubscription(previous.groupId, previous.deviceId)
    const session = makeSession(name, 'member', group.id)
    const response = NextResponse.json({ session: sessionView(session), group }, { status: body.action === 'create' ? 201 : 200 })
    response.cookies.set(sessionCookie(encodeSession(session)))
    return response
  } catch (error) { return apiError(error) }
}
export async function DELETE(request: NextRequest) {
  try {
    requireSameOrigin(request)
    const session = await currentSession()
    if (session) await store.disableSubscription(session.groupId, session.deviceId)
    const response = NextResponse.json({ ok: true }); response.cookies.set(clearSessionCookie()); return response
  } catch (error) { return apiError(error) }
}
