import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSameOrigin, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { cleanAlarm } from '@/lib/server/validation'
import { scheduleAlarm } from '@/lib/server/scheduler'
export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request)
    const session = await requireSession(); const id = (await context.params).id; const previous = await store.alarm(id)
    if (!previous || previous.groupId !== session.groupId) return NextResponse.json({ error: 'Alarm not found.' }, { status: 404 })
    if (previous.creatorId !== session.deviceId && session.role !== 'admin') return NextResponse.json({ error: 'Only the creator can edit this alarm.' }, { status: 403 })
    const body = await request.json() as Record<string, unknown>; if (Number(body.revision) !== previous.revision) return NextResponse.json({ error: 'This alarm changed. Refresh and try again.' }, { status: 409 })
    const alarm = { ...previous, ...cleanAlarm(body), revision: previous.revision + 1, status: 'scheduling' as const, updatedAt: Date.now() }; await store.saveAlarm(alarm)
    try { await scheduleAlarm(alarm); const scheduled = { ...alarm, status: 'scheduled' as const }; await store.saveAlarm(scheduled); return NextResponse.json({ alarm: scheduled }) } catch (error) { await store.saveAlarm({ ...alarm, status: 'failed' }); return apiError(error, 503) }
  } catch (error) { return apiError(error, 401) }
}
export async function DELETE(_: NextRequest, context: Context) {
  try { requireSameOrigin(_) } catch (error) { return apiError(error, 403) }
  try { const session = await requireSession(); const alarm = await store.alarm((await context.params).id); if (!alarm || alarm.groupId !== session.groupId) return NextResponse.json({ error: 'Alarm not found.' }, { status: 404 }); if (alarm.creatorId !== session.deviceId && session.role !== 'admin') return NextResponse.json({ error: 'Only the creator can cancel this alarm.' }, { status: 403 }); const cancelled = { ...alarm, status: 'cancelled' as const, revision: alarm.revision + 1, updatedAt: Date.now() }; await store.saveAlarm(cancelled); return NextResponse.json({ alarm: cancelled }) } catch (error) { return apiError(error, 401) }
}
