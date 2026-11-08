import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { sendTest } from '@/lib/push';

// POST: send a test notification to the signed-in person's own devices
export async function POST(req) {
  const g = await adminGuard(req, { perm: 'reservations.view' }); if (g.res) return g.res;
  try { return NextResponse.json({ sent: await sendTest(await db(), g.session) }); }
  catch (e) { console.error('[push test]', e?.message); return NextResponse.json({ error: 'push_failed' }, { status: 500 }); }
}
