import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { updateItem, deleteItem } from '@/lib/admin/menu-ops';

// PATCH: change name / English name / price / availability / category / photo ({ imageId } or { imageId: null }), or { move: 'up' | 'down' }
export async function PATCH(req, { params }) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  try {
    const r = await updateItem(await db(), id, b);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] update item:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}

// DELETE: remove an item for good (to just hide it from guests, PATCH { available: false } instead)
export async function DELETE(req, { params }) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  const { id } = await params;
  try {
    const r = await deleteItem(await db(), id);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] delete item:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
