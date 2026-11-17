import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { getTables } from '@/lib/data';
import { adminGuard } from '@/lib/admin/server';
import { isValidDate } from '@/lib/booking';
import { busyOf } from '@/lib/admin/manual';
import { activeRows } from '@/lib/admin/reservation';

// GET ?date=YYYY-MM-DD&exclude=CODE : every table with its occupied ranges that day (used by the manual-reservation form).
export async function GET(req) {
  const g = await adminGuard(req, { perm: 'reservations.manage' });
  if (g.res) return g.res;
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date');
  if (!isValidDate(date)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  try {
    const col = (await db()).collection('reservations');
    const [tables, rows] = await Promise.all([getTables(), activeRows(col, date, (sp.get('exclude') || '').toUpperCase() || null)]);
    const busy = busyOf(rows);
    return NextResponse.json({ tables: tables.map((t) => ({ ...t, busy: busy[t.id] || [] })) });
  } catch { return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
