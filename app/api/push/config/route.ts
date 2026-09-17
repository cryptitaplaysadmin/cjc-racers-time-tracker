import { NextResponse } from 'next/server'
import { missingConfig } from '@/lib/server/config'
export const runtime = 'nodejs'
export async function GET() { const missing = missingConfig(); return NextResponse.json({ ready: missing.length === 0, missing, publicKey: missing.length === 0 ? process.env.VAPID_PUBLIC_KEY : undefined }, { headers: { 'Cache-Control': 'no-store' } }) }
