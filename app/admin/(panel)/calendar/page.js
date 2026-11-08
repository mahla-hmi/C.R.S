import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { can } from '@/lib/admin/permissions';
import { toJalali, MONTHS } from '@/lib/jalali-cal';
import { cafeNow, isValidDate, fd } from '@/lib/booking';
import MonthGrid from '@/components/admin/MonthGrid';
import DayBoard from '@/components/admin/DayBoard';
import AutoRefresh from '@/components/admin/AutoRefresh';
import DbError from '@/components/admin/DbError';
import NoAccess from '@/components/admin/NoAccess';
import { AdminCalendarSkeleton, AdminDaySkeleton } from '@/components/Skeleton';
export const dynamic = 'force-dynamic';

const MIN_JY = 1380, MAX_JY = 1450;
const pad = (n) => String(n).padStart(2, '0');
function parseMonth(s) {
  const m = /^(\d{4})-(\d{1,2})$/.exec(String(s || ''));
  const jy = m ? +m[1] : 0, jm = m ? +m[2] : 0;
  return jm >= 1 && jm <= 12 && jy >= MIN_JY && jy <= MAX_JY ? { jy, jm } : null;
}
const step = ({ jy, jm }, n) => { const t = jy * 12 + (jm - 1) + n; return { jy: Math.floor(t / 12), jm: (t % 12) + 1 }; };
const href = ({ jy, jm }) => `/admin/calendar?m=${jy}-${pad(jm)}`;
const Chevron = ({ dir }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={dir === 'prev' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} /></svg>;

// URL: /admin/calendar?m=1405-08 (Shamsi month) &d=2026-11-04 (the chosen day, ISO). Without parameters: this month, today selected.
export default async function CalendarPage({ searchParams }) {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');

  const sp = await searchParams;
  const today = cafeNow().date, tj = toJalali(today);
  const dParam = isValidDate(sp?.d) ? sp.d : null;
  const cur = parseMonth(sp?.m) || (dParam ? toJalali(dParam) : tj);
  const same = (a, b) => a.jy === b.jy && a.jm === b.jm;
  // the chosen day must belong to the month on screen; with no choice made, today is selected when it is in this month
  const selected = dParam ? (same(toJalali(dParam), cur) ? dParam : null) : (same(tj, cur) ? today : null);
  const prev = step(cur, -1), next = step(cur, 1);

  return (
    <>
      <AutoRefresh />
      <div className="ad-head"><div><h1>تقویم</h1><p className="ad-mut">برنامهٔ رزروها و وضعیت میزها در هر روز</p></div></div>
      <div className="cal-wrap">
        <section className="cal-main" aria-label="تقویم شمسی">
          <div className="cal-card">
            <div className="cal-nav">
              {prev.jy >= MIN_JY ? <Link className="cal-arrow" href={href(prev)} aria-label="ماه قبل"><Chevron dir="prev" /></Link> : <span className="cal-arrow off" />}
              <div className="cal-title"><b>{MONTHS[cur.jm - 1]} {fd(cur.jy)}</b>{!same(cur, tj) || selected !== today ? <Link href="/admin/calendar" className="cal-today">امروز</Link> : null}</div>
              {next.jy <= MAX_JY ? <Link className="cal-arrow" href={href(next)} aria-label="ماه بعد"><Chevron dir="next" /></Link> : <span className="cal-arrow off" />}
            </div>
            {/* each month shows a skeleton while its numbers load */}
            <Suspense key={`m${cur.jy}-${cur.jm}`} fallback={<AdminCalendarSkeleton />}>
              <MonthGrid jy={cur.jy} jm={cur.jm} selected={selected} today={today} />
            </Suspense>
          </div>
        </section>

        <section className="cal-side" id="day-detail" aria-live="polite">
          {selected ? (
            <Suspense key={`d${selected}`} fallback={<AdminDaySkeleton />}>
              <DayBoard date={selected} canManage={canManage} scroll={!!dParam} />
            </Suspense>
          ) : <div className="ad-empty"><b>یک روز را انتخاب کنید</b><p>با انتخاب هر روز از تقویم، رزروها و وضعیت میزهای همان روز نمایش داده می‌شود.</p></div>}
        </section>
      </div>
    </>
  );
}
