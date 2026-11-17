import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { getTables } from '@/lib/data';
import { isValidDate, BUFFER_MIN } from '@/lib/booking';
// Returns every table with its already-occupied ranges for the day. No personal data.
// The client works out which start times / tables are free for the chosen stay length.
export async function GET(req) {
  const date = new URL(req.url).searchParams.get('date');
  if (!isValidDate(date)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  try {
    const tables = await getTables();
    const rows = await (await db()).collection('reservations')
      .find({ date, active: true }, { projection: { tableId: 1, startMin: 1, endMin: 1 } }).toArray();
    const busy = {};
    for (const r of rows) (busy[r.tableId] ||= []).push([r.startMin, r.endMin + BUFFER_MIN]);
    return NextResponse.json({ tables: tables.map((t) => ({ ...t, busy: busy[t.id] || [] })) });
  } catch { return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
