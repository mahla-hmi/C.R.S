import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { updateCategory, deleteCategory } from '@/lib/admin/menu-ops';

// PATCH: rename / show or hide / change photo, or { move: 'up' | 'down' }
export async function PATCH(req, { params }) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  try {
    const r = await updateCategory(await db(), id, b);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] update category:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}

// DELETE: only an empty category can be deleted (409 category_not_empty otherwise)
export async function DELETE(req, { params }) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  const { id } = await params;
  try {
    const r = await deleteCategory(await db(), id);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] delete category:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
