import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { getVapid, saveSubscription, removeSubscription } from '@/lib/push';
import { validateSubscription } from '@/lib/push-core';

const need = { perm: 'reservations.view' }; // anyone who may see reservations may receive their notifications
const dbErr = (e) => { console.error('[push api]', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); };

// GET: the public key the browser needs to subscribe
export async function GET(req) {
  const g = await adminGuard(req, need); if (g.res) return g.res;
  try { return NextResponse.json({ publicKey: (await getVapid(await db())).publicKey }); } catch (e) { return dbErr(e); }
}
// POST { subscription }: remember this device for the signed-in person
export async function POST(req) {
  const g = await adminGuard(req, need); if (g.res) return g.res;
  const v = validateSubscription((await req.json().catch(() => ({}))).subscription);
  if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
  try { await saveSubscription(await db(), g.session, v.value); return NextResponse.json({ ok: true }); } catch (e) { return dbErr(e); }
}
// DELETE { endpoint }: forget this device (only the person's own devices)
export async function DELETE(req) {
  const g = await adminGuard(req, need); if (g.res) return g.res;
  const endpoint = (await req.json().catch(() => ({}))).endpoint;
  if (typeof endpoint !== 'string' || !endpoint) return NextResponse.json({ error: 'bad_subscription' }, { status: 400 });
  try { await removeSubscription(await db(), g.session, endpoint); return NextResponse.json({ ok: true }); } catch (e) { return dbErr(e); }
}
