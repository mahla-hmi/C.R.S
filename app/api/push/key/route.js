import { NextResponse } from 'next/server';
import { publicVapidKey } from '@/lib/push';

// GET: the public (non-secret) key a guest's browser needs to subscribe to booking notifications
export async function GET() {
  try { return NextResponse.json({ publicKey: await publicVapidKey() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (e) { console.error('[push key]', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
