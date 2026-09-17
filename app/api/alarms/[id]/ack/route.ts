import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSameOrigin, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
export const runtime = 'nodejs'
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request)
    const session = await requireSession()
    const alarm = await store.alarm((await context.params).id)
    if (!alarm || alarm.groupId !== session.groupId) return NextResponse.json({ error: 'Alarm not found.' }, { status: 404 })
    const body = await request.json()
    if (body.revision !== alarm.revision) return NextResponse.json({ error: 'Timer changed. Refresh and retry.' }, { status: 409 })
    if (!(await store.compareAndSetAlarm(alarm, { ...alarm, status: 'done', revision: alarm.revision + 1, updatedAt: Date.now() }))) return NextResponse.json({ error: 'Timer changed. Please retry.' }, { status: 409 })
    return NextResponse.json({ acknowledged: true, alarmId: alarm.id })
  } catch (error) { return apiError(error) }
}
