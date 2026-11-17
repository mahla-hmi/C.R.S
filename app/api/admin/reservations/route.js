import { NextResponse, after } from 'next/server';
import { db } from '@/lib/mongo';
import { getTables } from '@/lib/data';
import { adminGuard } from '@/lib/admin/server';
import { validateOwner, pickTable } from '@/lib/admin/manual';
import { activeRows } from '@/lib/admin/reservation';
import { cellsFor } from '@/lib/booking';
import { nameKeyOf, phoneKeyOf } from '@/lib/identity';
import { makeCode } from '@/lib/code';
import { sendStatusSms, sendBookingSms } from '@/lib/sms';
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// POST : the cafe books a table for a guest (phone call, walk-in). Same overlap protection as online bookings: the unique index.
export async function POST(req) {
  const g = await adminGuard(req, { perm: 'reservations.manage' });
  if (g.res) return g.res;
  const b = await req.json().catch(() => ({}));
  let tables, col;
  try { tables = await getTables(); col = (await db()).collection('reservations'); } catch { return bad('db', 500); }
  const r = validateOwner(b, tables);
  if (r.error) return bad(r.error);
  const v = r.value;
  const status = b.status === 'pending' ? 'pending' : 'confirmed'; // a booking made by the cafe itself is confirmed unless said otherwise
  try {
    if (v.tableId === 'auto') {
      const pick = pickTable(tables, await activeRows(col, v.date), v);
      if (!pick) return bad('no_table', 409);
      v.tableId = pick;
    }
  } catch { return bad('db', 500); }
  const now = new Date();
  const doc = {
    ...v, nameKey: nameKeyOf(v.name), phoneKey: phoneKeyOf(v.phone), cells: cellsFor(v.startMin, v.durationMin),
    active: true, status, source: 'owner', createdBy: g.session.user, createdAt: now,
    history: [{ status, at: now, by: g.session.user, created: true }],
  };
  for (let i = 0; i < 3; i++) {
    try {
      const code = makeCode();
      await col.insertOne({ ...doc, code });
      if (b.notify !== false) after(() => (status === 'confirmed' ? sendStatusSms({ ...v, code }, 'confirmed') : sendBookingSms(v, code)).catch((e) => console.error('SMS failed:', e?.message)));
      return NextResponse.json({ ok: true, code, tableId: v.tableId, endMin: v.endMin });
    } catch (e) {
      if (e?.code === 11000) {
        if (e.keyPattern?.code || /index: code_1/.test(e.message || '')) continue; // code collision: retry
        return bad('taken', 409);
      }
      console.error('[admin] manual reservation failed:', e?.message);
      return bad('db', 500);
    }
  }
  return bad('db', 500);
}
