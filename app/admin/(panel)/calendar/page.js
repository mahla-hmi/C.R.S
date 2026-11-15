import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { can } from '@/lib/admin/permissions';
import { calSys } from '@/lib/calendar-sys';
import { cafeNow, isValidDate } from '@/lib/booking';
import MonthGrid from '@/components/admin/MonthGrid';
import DayBoard from '@/components/admin/DayBoard';
import AutoRefresh from '@/components/admin/AutoRefresh';
import SwipeMonth from '@/components/admin/SwipeMonth';
import DbError from '@/components/admin/DbError';
import NoAccess from '@/components/admin/NoAccess';
import { AdminCalendarSkeleton, AdminDaySkeleton } from '@/components/admin/Skeletons';
export const dynamic = 'force-dynamic';

const pad = (n) => String(n).padStart(2, '0');
const Chevron = ({ dir }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={dir === 'prev' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} /></svg>;

// URL: /admin/calendar?m=1405-08 (Persian: Shamsi month) or ?m=2026-11 (English: Gregorian month), and &d=2026-11-04 (the chosen day, ISO).
// Without parameters: this month, today selected. A month in the other calendar's numbers is ignored (e.g. after switching language).
export default async function CalendarPage({ searchParams }) {
  const { lang, t, n } = await adminI18n();
  const C = t.cal, sys = calSys(lang);
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');

  const parseMonth = (s) => {
    const m = /^(\d{4})-(\d{1,2})$/.exec(String(s || ''));
    const y = m ? +m[1] : 0, mo = m ? +m[2] : 0;
    return mo >= 1 && mo <= 12 && y >= sys.MIN && y <= sys.MAX ? { y, m: mo } : null;
  };
  const step = ({ y, m }, k) => { const v = y * 12 + (m - 1) + k; return { y: Math.floor(v / 12), m: (v % 12) + 1 }; };
  const href = ({ y, m }) => `/admin/calendar?m=${y}-${pad(m)}`;

  const sp = await searchParams;
  const today = cafeNow().date, tp = sys.parts(today);
  const dParam = isValidDate(sp?.d) ? sp.d : null;
  const dp = dParam ? sys.parts(dParam) : null;
  const cur = parseMonth(sp?.m) || (dp ? { y: dp.y, m: dp.m } : { y: tp.y, m: tp.m });
  const same = (a, b) => a.y === b.y && a.m === b.m;
  // the chosen day must belong to the month on screen; with no choice made, today is selected when it is in this month
  const selected = dParam ? (same(dp, cur) ? dParam : null) : (same(tp, cur) ? today : null);
  const prev = step(cur, -1), next = step(cur, 1);

  return (
    <>
      <AutoRefresh />
      <div className="ad-head"><div><h1>{C.title}</h1><p className="ad-mut">{C.sub}</p></div></div>
      <div className="cal-wrap">
        <section className="cal-main" id="cal-top" aria-label={C.aria}>
          <SwipeMonth className="cal-card" prev={prev.y >= sys.MIN ? href(prev) : null} next={next.y <= sys.MAX ? href(next) : null}>
            <div className="cal-nav">
              {prev.y >= sys.MIN ? <Link className="cal-arrow" href={href(prev)} aria-label={C.prev}><Chevron dir="prev" /></Link> : <span className="cal-arrow off" />}
              <div className="cal-title"><b>{sys.MONTHS[cur.m - 1]} {n(cur.y)}</b>{!same(cur, tp) || selected !== today ? <Link href="/admin/calendar" className="cal-today">{C.today}</Link> : null}</div>
              {next.y <= sys.MAX ? <Link className="cal-arrow" href={href(next)} aria-label={C.next}><Chevron dir="next" /></Link> : <span className="cal-arrow off" />}
            </div>
            {/* each month shows a skeleton while its numbers load */}
            <Suspense key={`m${lang}${cur.y}-${cur.m}`} fallback={<AdminCalendarSkeleton />}>
              <MonthGrid y={cur.y} m={cur.m} selected={selected} today={today} />
            </Suspense>
          </SwipeMonth>
        </section>

        <section className="cal-side" id="day-detail" aria-live="polite">
          {selected ? (
            <Suspense key={`d${lang}${selected}`} fallback={<AdminDaySkeleton />}>
              <DayBoard date={selected} canManage={canManage} scroll={!!dParam} />
            </Suspense>
          ) : <div className="ad-empty"><b>{C.pick}</b><p>{C.pickSub}</p></div>}
        </section>
      </div>
    </>
  );
}
