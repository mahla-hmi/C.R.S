import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
export const dynamic = 'force-dynamic';
// For uptime monitors / the VPS: 200 when the app can reach MongoDB (this also runs pending migrations), 503 otherwise.
export async function GET() {
  try { await (await db()).command({ ping: 1 }); return NextResponse.json({ ok: true }); }
  catch (e) { console.error('[health]', e?.message); return NextResponse.json({ ok: false }, { status: 503 }); }
}
