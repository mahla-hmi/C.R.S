import { NextResponse, after } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/mongo';
import { getTables } from '@/lib/data';
import { validate, cellsFor } from '@/lib/booking';
import { nameKeyOf, phoneKeyOf } from '@/lib/identity';
import { sendBookingSms } from '@/lib/sms';
import { notifyNewReservation, saveGuestSubscription, notifyGuest } from '@/lib/push';
import { validateGuestSubscription } from '@/lib/guest-push-core';
const bad = (error, status = 400) => NextResponse.json({ error }, { status });
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const makeCode = () => Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join('');

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  let tables;
  try { tables = await getTables(); } catch { return bad('db', 500); }
  const r = validate(b, tables);
  if (r.error) return bad(r.error);
  const v = r.value;
  let col;
  try { col = (await db()).collection('reservations'); } catch { return bad('db', 500); }
  const doc = { ...v, nameKey: nameKeyOf(v.name), phoneKey: phoneKeyOf(v.phone), cells: cellsFor(v.startMin, v.durationMin), active: true, status: 'pending', createdAt: new Date() };
  for (let i = 0; i < 3; i++) {
    try {
      const code = makeCode();
      await col.insertOne({ ...doc, code });
      // SMS runs after the response is sent; a failing SMS provider never fails the booking
      after(() => sendBookingSms(v, code).catch((e) => console.error('SMS failed:', e?.message)));
      after(() => notifyNewReservation({ ...v, code }).catch((e) => console.error('Owner notification failed:', e?.message))); // web push (+ optional owner SMS)
      // the guest's own device (only when they ticked "notify me" and allowed notifications): remember it for this booking, then confirm
      const sub = validateGuestSubscription(b.push);
      if (sub.value) after(async () => { try { await saveGuestSubscription(await db(), code, v.date, sub.value); await notifyGuest({ ...v, code }, 'created'); } catch (e) { console.error('Guest notification failed:', e?.message); } });
      return NextResponse.json({ code, endMin: v.endMin });
    } catch (e) {
      if (e?.code === 11000) {
        if (e.keyPattern?.code || /index: code_1/.test(e.message || '')) continue; // code collision: retry
        return bad('taken', 409); // overlap with an existing active booking
      }
      return bad('db', 500);
    }
  }
  return bad('db', 500);
}
