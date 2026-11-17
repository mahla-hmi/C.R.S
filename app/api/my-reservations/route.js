import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { nameKeyOf, phoneKeyOf } from '@/lib/identity';
import { limited } from '@/lib/ratelimit';
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// POST (not GET) so name/phone never end up in URLs or access logs.
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const b = await req.json().catch(() => ({}));
  const nameKey = nameKeyOf(b.name), phoneKey = phoneKeyOf(b.phone);
  if (nameKey.length < 2 || phoneKey.length < 7) return bad('bad_contact');
  // stops guessing names for a known phone number, and hammering from one address
  if (limited('ip:' + ip, 12, 60_000) || limited('ph:' + phoneKey, 20, 3_600_000)) return bad('rate', 429);
  try {
    const rows = await (await db()).collection('reservations')
      .find({ nameKey, phoneKey, startMin: { $exists: true } }, { projection: { _id: 0, code: 1, date: 1, startMin: 1, endMin: 1, durationMin: 1, purpose: 1, guests: 1, tableId: 1, status: 1, note: 1 } })
      .sort({ date: -1, startMin: -1 }).limit(50).toArray();
    return NextResponse.json({ items: rows });
  } catch { return bad('db', 500); }
}
