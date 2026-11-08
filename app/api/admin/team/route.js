import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { createMember } from '@/lib/admin/team-ops';

// POST: add a team member (owners only)
export async function POST(req) {
  const g = await adminGuard(req, { owner: true });
  if (g.res) return g.res;
  const b = await req.json().catch(() => ({}));
  try {
    const r = await createMember((await db()).collection('admins'), g.session, b);
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] create member:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
