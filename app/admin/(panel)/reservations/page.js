import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listReservations, viewCounts, VIEWS } from '@/lib/admin/data';
import { adminI18n } from '@/lib/admin/lang';
import ReservationCard from '@/components/admin/ReservationCard';
import AutoRefresh from '@/components/admin/AutoRefresh';
import DbError from '@/components/admin/DbError';
import NoAccess from '@/components/admin/NoAccess';
import { getSession } from '@/lib/admin/server';
import { can } from '@/lib/admin/permissions';
import { AdminListSkeleton } from '@/components/admin/Skeletons';
export const dynamic = 'force-dynamic';

export default async function ReservationsPage({ searchParams }) {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');
  const { t, fill } = await adminI18n();
  const L = t.list;
  const sp = await searchParams;
  const view = VIEWS.includes(sp?.view) ? sp.view : 'all';
  const q = String(sp?.q || '').slice(0, 60);
  const page = Math.max(1, parseInt(sp?.page, 10) || 1);
  return (
    <>
      <AutoRefresh />
      <div className="ad-head"><h1>{L.title}</h1>{canManage && <Link className="ad-btn primary" href="/admin/reservations/new">{L.manual}</Link>}</div>

      <form action="/admin/reservations" className="ad-search" role="search">
        <input type="hidden" name="view" value={view} />
        <input name="q" defaultValue={q} placeholder={L.searchPh} aria-label={L.searchAria} />
        <button className="ad-btn primary" type="submit">{L.search}</button>
        {q && <Link className="ad-btn" href={`/admin/reservations?view=${view}`}>{L.clear}</Link>}
      </form>

      {/* the key changes with every filter / search / page, so each change shows the skeleton while the list loads */}
      <Suspense key={`${view}|${q}|${page}`} fallback={<AdminListSkeleton />}>
        <ReservationsList view={view} q={q} page={page} canManage={canManage} />
      </Suspense>
    </>
  );
}

async function ReservationsList({ view, q, page, canManage }) {
  const { t, n, fill } = await adminI18n();
  const L = t.list;
  let data, counts;
  try { [data, counts] = await Promise.all([listReservations({ view, q, page }), viewCounts()]); }
  catch (e) { console.error('[admin] reservations:', e?.message); return <DbError />; }
  const href = (o) => '/admin/reservations?' + new URLSearchParams({ view, ...(q ? { q } : {}), ...o }).toString();
  return (
    <>
      <p className="ad-mut ad-total">{q ? fill(L.countFor, { n: n(data.total), q }) : fill(L.count, { n: n(data.total) })}</p>

      <nav className="ad-views" aria-label={L.filter}>
        {VIEWS.map((v) => (
          <Link key={v} href={href({ view: v })} className={`ad-pill${v === view ? ' on' : ''}${v === 'pending' && counts.pending > 0 ? ' hot' : ''}`} aria-current={v === view ? 'page' : undefined}>
            {t.views[v]}<em>{n(counts[v])}</em>
          </Link>
        ))}
      </nav>

      {data.items.length ? <div className="ad-cards">{data.items.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
        : <div className="ad-empty"><b>{L.empty}</b><p>{q ? L.emptyQ : L.emptyNone}</p></div>}

      {data.pages > 1 && (
        <div className="ad-pager">
          {data.page > 1 ? <Link className="ad-btn" href={href({ page: data.page - 1 })}>{L.prev}</Link> : <span />}
          <span className="ad-mut">{fill(L.page, { a: n(data.page), b: n(data.pages) })}</span>
          {data.page < data.pages ? <Link className="ad-btn" href={href({ page: data.page + 1 })}>{L.next}</Link> : <span />}
        </div>
      )}
    </>
  );
}
