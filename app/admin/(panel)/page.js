import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dashboard } from '@/lib/admin/data';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { fmt } from '@/lib/jalali';
import { fmtTime } from '@/lib/booking';
import ReservationCard from '@/components/admin/ReservationCard';
import StatusBadge from '@/components/admin/StatusBadge';
import AutoRefresh from '@/components/admin/AutoRefresh';
import DbError from '@/components/admin/DbError';
import PushSetup from '@/components/admin/PushSetup';
import NoAccess from '@/components/admin/NoAccess';
import { can } from '@/lib/admin/permissions';
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const { lang, t, n, fill } = await adminI18n();
  const D = t.dash;
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');
  let d = null;
  try { d = await dashboard(); } catch (e) { console.error('[admin] dashboard:', e?.message); }
  if (!d) return <DbError />;
  const tiles = [
    { href: '/admin/reservations?view=pending', num: d.pending, label: D.pending, hot: d.pending > 0 },
    { href: '/admin/reservations?view=today', num: d.todayLive, label: D.todayN },
    { num: d.guestsToday, label: D.guestsToday },
    { href: '/admin/reservations?view=upcoming', num: d.upcoming, label: D.upcoming },
  ];
  return (
    <>
      <AutoRefresh />
      <div className="ad-head">
        <div><h1>{fill(D.welcome, { name: session.name })}</h1><p className="ad-mut">{fmt(d.today, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        {canManage && <Link className="ad-btn primary" href="/admin/reservations/new">{D.manual}</Link>}
      </div>
      <PushSetup variant="card" />
      <div className="ad-stats">
        {tiles.map((x) => {
          const body = <><span className="ad-n">{n(x.num)}</span><span className="ad-l">{x.label}</span></>;
          return x.href ? <Link key={x.label} href={x.href} className={`ad-tile${x.hot ? ' hot' : ''}`}>{body}</Link> : <div key={x.label} className="ad-tile">{body}</div>;
        })}
      </div>

      <section className="ad-sec">
        <div className="ad-sech"><h2>{D.needs}</h2>{d.pending > 6 && <Link href="/admin/reservations?view=pending">{fill(D.viewAll, { n: n(d.pending) })}</Link>}</div>
        {d.needs.length ? <div className="ad-cards">{d.needs.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
          : <div className="ad-empty"><b>{D.needsEmpty}</b><p>{D.needsEmptySub}</p></div>}
      </section>

      <section className="ad-sec">
        <div className="ad-sech"><h2>{D.schedule}</h2><Link href="/admin/reservations?view=today">{D.allToday}</Link></div>
        {d.schedule.length ? (
          <ul className="ad-sched">{d.schedule.map((r) => (
            <li key={r.code}><b className="ad-t">{fmtTime(r.startMin, lang)}</b><span className="ad-sn">{r.name}</span>
              <span className="ad-sm">{fill(D.row, { id: r.tableId, g: fill(r.guests === 1 ? t.guest1 : t.guestN, { n: n(r.guests) }) })}</span><StatusBadge status={r.status} /></li>))}</ul>
        ) : <div className="ad-empty"><b>{D.noToday}</b></div>}
      </section>
    </>
  );
}
