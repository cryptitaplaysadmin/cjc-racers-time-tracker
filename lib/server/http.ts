import { NextResponse } from 'next/server'
import { currentSession } from './auth'
import { publicReadiness } from './config'
import { store } from './store'

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new Error('This request must come from the app.')
}
export function sessionView(session: Awaited<ReturnType<typeof requireSession>>) { return { deviceId: session.deviceId, name: session.name, role: session.role } }

export function apiError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Request failed.'
  return NextResponse.json({ error: message }, { status })
}
export async function requireSession() {
  const session = await currentSession()
  if (!session) throw new Error('Join the group before using shared alarms.')
  if (!(await store.group(session.groupId))) throw new Error('Create or join an account group to continue. Your previous group is no longer available.')
  return session
}
export function readinessResponse() { return NextResponse.json(publicReadiness(), { headers: { 'Cache-Control': 'no-store' } }) }
