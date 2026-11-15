import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { bulkPreview, bulkApply } from '@/lib/admin/menu-ops';

// POST { mode: 'preview' | 'apply', direction: 'up' | 'down', percent, round, scope: 'all' | [categoryId, ...] }
// Changes every price in scope by the percentage. OWNERS ONLY (a staff member with "menu.manage" can still edit prices one by one).
export async function POST(req) {
  const g = await adminGuard(req, { owner: true });
  if (g.res) return g.res;
  const b = await req.json().catch(() => ({}));
  try {
    const d = await db();
    const r = b.mode === 'apply' ? await bulkApply(d, g.session, b) : await bulkPreview(d, b);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] bulk prices:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
