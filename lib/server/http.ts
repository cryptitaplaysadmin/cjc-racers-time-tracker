import { NextResponse } from 'next/server'
import { currentSession } from './auth'
import { publicReadiness } from './config'

export function apiError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Request failed.'
  return NextResponse.json({ error: message }, { status })
}
export async function requireSession() {
  const session = await currentSession()
  if (!session) throw new Error('Join the group before using shared alarms.')
  return session
}
export function readinessResponse() { return NextResponse.json(publicReadiness(), { headers: { 'Cache-Control': 'no-store' } }) }
