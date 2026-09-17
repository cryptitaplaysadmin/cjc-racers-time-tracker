import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSameOrigin, requireSession } from '@/lib/server/http'
import { playingTransition } from '@/lib/server/groups'
import { store } from '@/lib/server/store'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    const session = await requireSession()
    const body = await request.json() as Record<string, unknown>
    const group = await store.group(session.groupId)
    if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
    let next
    try { next = playingTransition(group, session, body.action, body.revision) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Playing status changed.', group }, { status: 409 }) }
    if (!(await store.compareAndSetGroup(group, next))) return NextResponse.json({ error: 'The playing status changed. Review it and try again.', group: await store.group(group.id) }, { status: 409 })
    return NextResponse.json({ group: next })
  } catch (error) { return apiError(error, 401) }
}
