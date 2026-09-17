import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSameOrigin, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    const session = await requireSession()
    const body = await request.json()
    const group = await store.group(session.groupId)
    if (!group) return NextResponse.json({ error: 'Group not found.' }, { status: 404 })
    if (body.revision !== group.revision) return NextResponse.json({ error: 'Group changed. Try again.', group }, { status: 409 })
    const now = Date.now()
    let stopwatch = group.stopwatch ?? null
    if (body.action === 'start') {
      if (stopwatch && stopwatch.stoppedAt === null) return NextResponse.json({ error: 'The stopwatch is already running.', group }, { status: 409 })
      stopwatch = { label: typeof body.label === 'string' ? body.label.trim().slice(0, 120) || 'Group stopwatch' : 'Group stopwatch', startedAt: now, stoppedAt: null }
    } else if (body.action === 'stop') {
      if (!stopwatch || stopwatch.stoppedAt !== null) return NextResponse.json({ error: 'No running stopwatch.', group }, { status: 409 })
      stopwatch = { ...stopwatch, stoppedAt: now }
    } else if (body.action === 'reset') stopwatch = null
    else return NextResponse.json({ error: 'Invalid stopwatch action.' }, { status: 400 })
    const next = { ...group, stopwatch, revision: group.revision + 1 }
    if (!(await store.compareAndSetGroup(group, next))) return NextResponse.json({ error: 'Group changed. Try again.' }, { status: 409 })
    return NextResponse.json({ group: next, serverTime: now })
  } catch (error) { return apiError(error) }
}
