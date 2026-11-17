import { NextResponse } from 'next/server';
import { SESSION_HOURS, COOKIE, adminName, checkLogin, signSession, cookieOptions } from '@/lib/admin/auth';
import { verifyMemberLogin, touchLogin } from '@/lib/admin/team-ops';
import { db } from '@/lib/mongo';
import { limited } from '@/lib/ratelimit';

const invalid = async () => { await new Promise((r) => setTimeout(r, 500)); return NextResponse.json({ error: 'invalid' }, { status: 401 }); }; // slows down guessing

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const b = await req.json().catch(() => ({}));
  const user = String(b.user || '').trim(), password = String(b.password || '');
  if (limited('login:' + ip, 8, 5 * 60_000) || limited('loginu:' + user.toLowerCase(), 10, 15 * 60_000)) return NextResponse.json({ error: 'rate' }, { status: 429 });
  const o = req.headers.get('origin');
  if (o) { try { if (new URL(o).host !== req.headers.get('host')) throw 0; } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); } }

  let token;
  if (await checkLogin(user, password)) { // 1) the main owner (works even when the database is down)
    token = await signSession(adminName(), SESSION_HOURS, { k: 'p' });
  } else { // 2) a team member
    try {
      const col = (await db()).collection('admins');
      const m = await verifyMemberLogin(col, user, password);
      if (!m) return invalid();
      await touchLogin(col, m._id);
      token = await signSession(m.username, SESSION_HOURS, { k: 'd', tv: m.tokenVersion || 0 });
    } catch (e) { console.error('[admin] login:', e?.message); return NextResponse.json({ error: 'db' }, { status: 503 }); }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}
