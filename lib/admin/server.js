// Server-only helpers. Every admin page and API route calls these itself:
// the middleware only checks that the cookie is genuine (it cannot ask the database), never what the person may do.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE, adminName, verifySession } from './auth';
import { ALL_PERMS, can } from './permissions';
import { findMemberByUsername } from './team-ops';
import { db } from '../mongo';

// token -> who this is RIGHT NOW. Team members are re-read from the database on every request,
// so disabling someone, changing their role/permissions or their password takes effect immediately.
export async function resolveSession(tok) {
  if (!tok) return null;
  if (tok.kind === 'p') { // the main owner (credentials in .env.local); always full access, cannot be locked out from the panel
    return tok.user === adminName() ? { user: tok.user, name: tok.user, role: 'owner', perms: ALL_PERMS, primary: true, id: null } : null;
  }
  const m = await findMemberByUsername((await db()).collection('admins'), tok.user);
  if (!m || !m.active || (m.tokenVersion || 0) !== tok.tv) return null;
  return { user: m.username, name: m.name, role: m.role, perms: m.role === 'owner' ? ALL_PERMS : m.perms || [], primary: false, id: m._id };
}
// for pages (layouts/pages may call it several times per request; the database is asked once)
export const getSession = cache(async () => resolveSession(await verifySession((await cookies()).get(COOKIE)?.value)));

// for API routes. need: { owner: true } or { perm: 'reservations.manage' }. Returns { session } or a ready { res }.
export async function adminGuard(req, need = {}) {
  let session;
  try { session = await resolveSession(await verifySession(req.cookies.get(COOKIE)?.value)); }
  catch { return { res: NextResponse.json({ error: 'db' }, { status: 500 }) }; }
  if (!session) return { res: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  if (req.method !== 'GET') { // CSRF: a browser POST from another site carries a foreign Origin
    const o = req.headers.get('origin');
    if (o) { try { if (new URL(o).host !== req.headers.get('host')) throw 0; } catch { return { res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }; } }
  }
  if (need.owner && session.role !== 'owner') return { res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  if (need.perm && !can(session, need.perm)) return { res: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  return { session };
}
