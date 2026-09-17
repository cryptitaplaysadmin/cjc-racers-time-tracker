import { NextRequest, NextResponse } from 'next/server'
import { verifyJobSignature } from '@/lib/server/scheduler'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) { const raw = await request.text(); if (!(await verifyJobSignature(raw, request.headers.get('upstash-signature')))) return NextResponse.json({ error: 'Invalid job signature.' }, { status: 401 }); return NextResponse.json({ error: 'Periodic reconciliation is not implemented. Inspect failed QStash deliveries; dispatch retries are enabled.' }, { status: 501 }) }
