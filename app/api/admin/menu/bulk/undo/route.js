import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { bulkUndo } from '@/lib/admin/menu-ops';

// POST: undo the last bulk price change (owners only). Prices edited by hand since then are left as they are.
export async function POST(req) {
  const g = await adminGuard(req, { owner: true });
  if (g.res) return g.res;
  try {
    const r = await bulkUndo(await db());
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] undo bulk:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
