import { NextResponse } from 'next/server';
import { COOKIE, verifySession } from '@/lib/admin/auth';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  // owner panel: everything except the login page needs a valid session (pages re-check it themselves too)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return NextResponse.next();
    if (await verifySession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
    const url = req.nextUrl.clone(); url.pathname = '/admin/login'; url.search = '';
    return NextResponse.redirect(url);
  }
  // public site: add the language prefix (keeps ?query such as ?table=W1)
  if (!/^\/(fa|en)(\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone(); url.pathname = '/fa' + (pathname === '/' ? '' : pathname);
    return NextResponse.redirect(url);
  }
}
export const config = { matcher: ['/((?!_next|api|.*\\..*).*)'] };
