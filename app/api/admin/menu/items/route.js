import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { createItem } from '@/lib/admin/menu-ops';

// POST: add a menu item { categoryId, fa, en?, price, imageId? } (needs the "menu.manage" permission)
export async function POST(req) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  const b = await req.json().catch(() => ({}));
  try {
    const r = await createItem(await db(), b);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] create item:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
