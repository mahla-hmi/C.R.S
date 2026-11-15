import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { getSession } from '@/lib/admin/server';
import { LANG_COOKIE, LANGS } from '@/lib/admin/i18n';

// POST { lang: 'fa' | 'en' } : remember the panel language in a cookie. Works on the login page too (no session needed).
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!LANGS.includes(b.lang)) return NextResponse.json({ error: 'bad_lang' }, { status: 400 });
  const o = req.headers.get('origin'); // same-site requests only
  if (o) { try { if (new URL(o).host !== req.headers.get('host')) throw 0; } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); } }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LANG_COOKIE, b.lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  // signed-in people: their notification devices follow the language too
  try { const s = await getSession(); if (s) await (await db()).collection('push_subscriptions').updateMany({ user: s.user }, { $set: { lang: b.lang } }); } catch { /* best effort */ }
  return res;
}
