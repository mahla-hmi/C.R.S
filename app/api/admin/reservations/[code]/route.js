import { NextResponse, after } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { MOVES, LIVE, isLive } from '@/lib/admin/rules';
import { sendStatusSms, sendChangeSms } from '@/lib/sms';
import { getTables } from '@/lib/data';
import { cafeNow, cellsFor } from '@/lib/booking';
import { nameKeyOf, phoneKeyOf } from '@/lib/identity';
import { validateOwner, pickTable, changedFields, GUEST_VISIBLE } from '@/lib/admin/manual';
import { activeRows } from '@/lib/admin/reservation';
import { notifyGuest } from '@/lib/push';

// PATCH { status } : confirm / reject / cancel / complete / no-show. Only valid moves are applied, atomically.
export async function PATCH(req, { params }) {
  const g = await adminGuard(req, { perm: 'reservations.manage' });
  if (g.res) return g.res;
  const { code } = await params;
  const b = await req.json().catch(() => ({}));
  const to = String(b.status);
  if (!Object.hasOwn(MOVES, to)) return NextResponse.json({ error: 'bad_status' }, { status: 400 });
  try {
    const col = (await db()).collection('reservations');
    const now = new Date();
    const doc = await col.findOneAndUpdate(
      { code: String(code).toUpperCase(), status: { $in: MOVES[to] } },
      { $set: { status: to, active: isLive(to), updatedAt: now }, $push: { history: { status: to, at: now, by: g.session.user } } },
      { returnDocument: 'after', projection: { cells: 0 } },
    );
    if (!doc) { // either no such code, or the reservation is no longer in a state this move can start from
      const exists = await col.findOne({ code: String(code).toUpperCase() }, { projection: { status: 1 } });
      return NextResponse.json({ error: exists ? 'bad_transition' : 'not_found', status: exists?.status }, { status: exists ? 409 : 404 });
    }
    if (['confirmed', 'rejected', 'cancelled'].includes(to)) {
      after(() => sendStatusSms(doc, to).catch((e) => console.error('SMS failed:', e?.message)));
      after(() => notifyGuest(doc, to).catch((e) => console.error('Guest notification failed:', e?.message))); // the guest's device, if they allowed it when booking
    }
    return NextResponse.json({ ok: true, status: to });
  } catch (e) { console.error('[admin] status update failed:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}

// PUT : the cafe changes a pending or confirmed booking (time, table, party size, contact details...).
// The unique no_overlap index decides whether the new slot is free, so two people editing at once can never double-book a table.
export async function PUT(req, { params }) {
  const g = await adminGuard(req, { perm: 'reservations.manage' });
  if (g.res) return g.res;
  const code = String((await params).code).toUpperCase();
  const b = await req.json().catch(() => ({}));
  const err = (error, status = 400) => NextResponse.json({ error }, { status });
  try {
    const col = (await db()).collection('reservations');
    const existing = await col.findOne({ code }, { projection: { cells: 0 } });
    if (!existing) return err('not_found', 404);
    if (!LIVE.includes(existing.status)) return err('bad_transition', 409); // finished or cancelled bookings are history
    const tables = await getTables();
    const r = validateOwner(b, tables, cafeNow(), existing);
    if (r.error) return err(r.error);
    const v = r.value;
    if (v.tableId === 'auto') {
      const pick = pickTable(tables, await activeRows(col, v.date, code), v);
      if (!pick) return err('no_table', 409);
      v.tableId = pick;
    }
    const changed = changedFields(existing, v);
    if (!changed.length) return NextResponse.json({ ok: true, unchanged: true });
    const now = new Date();
    const set = {
      date: v.date, startMin: v.startMin, endMin: v.endMin, durationMin: v.durationMin, purpose: v.purpose, special: v.special, guests: v.guests, tableId: v.tableId,
      name: v.name, email: v.email, phone: v.phone, note: v.note, nameKey: nameKeyOf(v.name), phoneKey: phoneKeyOf(v.phone), cells: cellsFor(v.startMin, v.durationMin), updatedAt: now,
    };
    let doc;
    try {
      doc = await col.findOneAndUpdate(
        { code, status: existing.status },
        { $set: set, $push: { history: { status: existing.status, at: now, by: g.session.user, edit: changed } } },
        { returnDocument: 'after', projection: { cells: 0 } },
      );
    } catch (e) { if (e?.code === 11000) return err('taken', 409); throw e; }
    if (!doc) return err('bad_transition', 409); // its status changed while the form was open
    if (b.notify !== false && changed.some((k) => GUEST_VISIBLE.includes(k))) {
      after(() => sendChangeSms(doc).catch((e) => console.error('SMS failed:', e?.message)));
      after(() => notifyGuest(doc, 'changed').catch((e) => console.error('Guest notification failed:', e?.message)));
    }
    return NextResponse.json({ ok: true, changed });
  } catch (e) { console.error('[admin] edit failed:', e?.message); return err('db', 500); }
}
