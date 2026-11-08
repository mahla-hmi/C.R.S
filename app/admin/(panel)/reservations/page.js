import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listReservations, viewCounts, VIEWS } from '@/lib/admin/data';
import { VIEW_LABEL } from '@/lib/admin/labels';
import { fd } from '@/lib/booking';
import ReservationCard from '@/components/admin/ReservationCard';
import AutoRefresh from '@/components/admin/AutoRefresh';
import DbError from '@/components/admin/DbError';
import NoAccess from '@/components/admin/NoAccess';
import { getSession } from '@/lib/admin/server';
import { can } from '@/lib/admin/permissions';
import { AdminListSkeleton } from '@/components/Skeleton';
export const dynamic = 'force-dynamic';

export default async function ReservationsPage({ searchParams }) {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');
  const sp = await searchParams;
  const view = VIEWS.includes(sp?.view) ? sp.view : 'all';
  const q = String(sp?.q || '').slice(0, 60);
  const page = Math.max(1, parseInt(sp?.page, 10) || 1);
  return (
    <>
      <AutoRefresh />
      <div className="ad-head"><h1>رزروها</h1>{canManage && <Link className="ad-btn primary" href="/admin/reservations/new">+ رزرو دستی</Link>}</div>

      <form action="/admin/reservations" className="ad-search" role="search">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} placeholder="جستجو: نام، شمارهٔ تماس یا کد پیگیری" aria-label="جستجو" />
        <button className="ad-btn primary" type="submit">جستجو</button>
        {q && <Link className="ad-btn" href={`/admin/reservations?view=${view}`}>بازنشانی</Link>}
      </form>

      {/* the key changes with every filter / search / page, so each change shows the skeleton while the list loads */}
      <Suspense key={`${view}|${q}|${page}`} fallback={<AdminListSkeleton />}>
        <ReservationsList view={view} q={q} page={page} canManage={canManage} />
      </Suspense>
    </>
  );
}

async function ReservationsList({ view, q, page, canManage }) {
  let data, counts;
  try { [data, counts] = await Promise.all([listReservations({ view, q, page }), viewCounts()]); }
  catch (e) { console.error('[admin] reservations:', e?.message); return <DbError />; }
  const href = (o) => '/admin/reservations?' + new URLSearchParams({ view, ...(q ? { q } : {}), ...o }).toString();
  return (
    <>
      <p className="ad-mut ad-total">{fd(data.total)} مورد{q ? ` برای «${q}»` : ''}</p>

      <nav className="ad-views" aria-label="فیلتر رزروها">
        {VIEWS.map((v) => (
          <Link key={v} href={href({ view: v })} className={`ad-pill${v === view ? ' on' : ''}${v === 'pending' && counts.pending > 0 ? ' hot' : ''}`} aria-current={v === view ? 'page' : undefined}>
            {VIEW_LABEL[v]}<em>{fd(counts[v])}</em>
          </Link>
        ))}
      </nav>

      {data.items.length ? <div className="ad-cards">{data.items.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
        : <div className="ad-empty"><b>موردی یافت نشد</b><p>{q ? 'عبارت جستجو یا فیلتر را تغییر دهید.' : 'در این بخش هنوز رزروی ثبت نشده است.'}</p></div>}

      {data.pages > 1 && (
        <div className="ad-pager">
          {data.page > 1 ? <Link className="ad-btn" href={href({ page: data.page - 1 })}>← قبلی</Link> : <span />}
          <span className="ad-mut">صفحهٔ {fd(data.page)} از {fd(data.pages)}</span>
          {data.page < data.pages ? <Link className="ad-btn" href={href({ page: data.page + 1 })}>بعدی →</Link> : <span />}
        </div>
      )}
    </>
  );
}
