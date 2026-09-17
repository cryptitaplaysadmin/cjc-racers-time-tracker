import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { apiError, requireSameOrigin, requireSession, sessionView } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { cleanAlarm } from '@/lib/server/validation'
import { scheduleAlarm } from '@/lib/server/scheduler'
import type { SharedAlarm } from '@/lib/server/models'
export const runtime = 'nodejs'
export async function GET() { try { const session = await requireSession(); const alarms = await store.alarms(session.groupId); return NextResponse.json({ alarms, session: sessionView(session), group: await store.group(session.groupId), serverTime: Date.now() }, { headers: { 'Cache-Control': 'no-store' } }) } catch (error) { return apiError(error, 401) } }
export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request)
    const session = await requireSession(); const input = cleanAlarm(await request.json() as Record<string, unknown>); const now = Date.now()
    const alarm: SharedAlarm = { id: randomUUID(), groupId: session.groupId, creatorId: session.deviceId, creatorName: session.name, ...input, revision: 1, status: 'scheduling', createdAt: now, updatedAt: now }
    await store.saveAlarm(alarm)
    try { await scheduleAlarm(alarm); const scheduled = { ...alarm, status: 'scheduled' as const, updatedAt: Date.now() }; await store.saveAlarm(scheduled); return NextResponse.json({ alarm: scheduled }, { status: 201 }) }
    catch (error) { const failed = { ...alarm, status: 'failed' as const, updatedAt: Date.now() }; await store.saveAlarm(failed); return apiError(error, 503) }
  } catch (error) { return apiError(error, 401) }
}
