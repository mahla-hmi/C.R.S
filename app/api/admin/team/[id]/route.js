import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { COOKIE, SESSION_HOURS, signSession, cookieOptions } from '@/lib/admin/auth';
import { updateMember, deleteMember } from '@/lib/admin/team-ops';

// PATCH: edit name / role / permissions / active / password (owners only)
export async function PATCH(req, { params }) {
  const g = await adminGuard(req, { owner: true });
  if (g.res) return g.res;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  try {
    const r = await updateMember((await db()).collection('admins'), g.session, id, b);
    const { reissue, ...body } = r.body;
    const res = NextResponse.json(body, { status: r.status });
    if (reissue) res.cookies.set(COOKIE, await signSession(reissue.username, SESSION_HOURS, { k: 'd', tv: reissue.tv }), cookieOptions());
    return res;
  } catch (e) { console.error('[admin] update member:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}

// DELETE: remove a team member (owners only; never yourself)
export async function DELETE(req, { params }) {
  const g = await adminGuard(req, { owner: true });
  if (g.res) return g.res;
  const { id } = await params;
  try {
    const d = await db();
    const r = await deleteMember(d.collection('admins'), g.session, id);
    if (r.status === 200) await d.collection('push_subscriptions').deleteMany({ user: r.body.username, kind: 'd' });
    return NextResponse.json({ ...r.body, username: undefined }, { status: r.status });
  } catch (e) { console.error('[admin] delete member:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
