import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireSameOrigin, requireSession } from '@/lib/server/http'
import { store } from '@/lib/server/store'
import { cleanPushSubscription } from '@/lib/server/validation'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try { requireSameOrigin(request) } catch (error) { return apiError(error, 403) }
  try { const session = await requireSession(); const subscription = cleanPushSubscription(await request.json()); const now = Date.now(); await store.saveSubscription({ ...subscription, deviceId: session.deviceId, groupId: session.groupId, enabled: true, createdAt: now, updatedAt: now }); return NextResponse.json({ enabled: true }) } catch (error) { return apiError(error, 401) }
}
export async function DELETE(request: NextRequest) { try { requireSameOrigin(request); const session = await requireSession(); await store.disableSubscription(session.groupId, session.deviceId); return NextResponse.json({ enabled: false }) } catch (error) { return apiError(error, 401) } }
