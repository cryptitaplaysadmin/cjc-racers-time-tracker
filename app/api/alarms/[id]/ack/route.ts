import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
export const runtime = 'nodejs'
export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const session = await requireSession(); const alarm = await store.alarm((await context.params).id); if (!alarm || alarm.groupId !== session.groupId) return NextResponse.json({ error: 'Alarm not found.' }, { status: 404 }); return NextResponse.json({ acknowledged: true, alarmId: alarm.id, deviceId: session.deviceId }) } catch (error) { return apiError(error, 401) }
}
