import { NextResponse } from 'next/server'
import { currentSession } from './auth'
import { publicReadiness } from './config'
import { store } from './store'
import { ApiError, errorStatus } from './errors'

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError('This request must come from the app.', 403)
}
export function sessionView(session: Awaited<ReturnType<typeof requireSession>>) { return { deviceId: session.deviceId, name: session.name, role: session.role } }

export function apiError(error: unknown, status = 503) {
  const message = error instanceof Error ? error.message : 'Request failed.'
  // Authentication failures are explicit ApiErrors; a failing dependency must
  // never clear a valid browser session through a broad legacy 401 catch.
  return NextResponse.json({ error: message }, { status: errorStatus(error, status === 401 ? 503 : status) })
}
export async function requireSession() {
  const session = await currentSession()
  if (!session) throw new ApiError('Join the group before using shared alarms.', 401)
  if (!(await store.group(session.groupId))) throw new ApiError('Create or join an account group to continue. Your previous group is no longer available.', 401)
  return session
}
export function readinessResponse() { return NextResponse.json(publicReadiness(), { headers: { 'Cache-Control': 'no-store' } }) }
