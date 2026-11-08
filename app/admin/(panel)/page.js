import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dashboard } from '@/lib/admin/data';
import { getSession } from '@/lib/admin/server';
import { fmt } from '@/lib/jalali';
import { fd, fmtTime } from '@/lib/booking';
import ReservationCard from '@/components/admin/ReservationCard';
import StatusBadge from '@/components/admin/StatusBadge';
import AutoRefresh from '@/components/admin/AutoRefresh';
import DbError from '@/components/admin/DbError';
import PushSetup from '@/components/admin/PushSetup';
import NoAccess from '@/components/admin/NoAccess';
import { can } from '@/lib/admin/permissions';
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.view')) return <NoAccess />;
  const canManage = can(session, 'reservations.manage');
  let d = null;
  try { d = await dashboard(); } catch (e) { console.error('[admin] dashboard:', e?.message); }
  if (!d) return <DbError />;
  const tiles = [
    { href: '/admin/reservations?view=pending', n: d.pending, label: 'در انتظار تأیید', hot: d.pending > 0 },
    { href: '/admin/reservations?view=today', n: d.todayLive, label: 'رزروهای امروز' },
    { n: d.guestsToday, label: 'میهمانان امروز' },
    { href: '/admin/reservations?view=upcoming', n: d.upcoming, label: 'رزروهای پیش‌رو' },
  ];
  return (
    <>
      <AutoRefresh />
      <div className="ad-head">
        <div><h1>خوش آمدید، {session.name}</h1><p className="ad-mut">{fmt(d.today, 'fa', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        {canManage && <Link className="ad-btn primary" href="/admin/reservations/new">+ رزرو دستی</Link>}
      </div>
      <PushSetup variant="card" />
      <div className="ad-stats">
        {tiles.map((t) => {
          const body = <><span className="ad-n">{fd(t.n)}</span><span className="ad-l">{t.label}</span></>;
          return t.href ? <Link key={t.label} href={t.href} className={`ad-tile${t.hot ? ' hot' : ''}`}>{body}</Link> : <div key={t.label} className="ad-tile">{body}</div>;
        })}
      </div>

      <section className="ad-sec">
        <div className="ad-sech"><h2>نیازمند اقدام</h2>{d.pending > 6 && <Link href="/admin/reservations?view=pending">مشاهدهٔ همه ({fd(d.pending)})</Link>}</div>
        {d.needs.length ? <div className="ad-cards">{d.needs.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
          : <div className="ad-empty"><b>درخواست جدیدی در انتظار بررسی نیست ✓</b><p>رزروهای جدید در همین بخش نمایش داده می‌شوند.</p></div>}
      </section>

      <section className="ad-sec">
        <div className="ad-sech"><h2>برنامهٔ امروز</h2><Link href="/admin/reservations?view=today">همهٔ رزروهای امروز</Link></div>
        {d.schedule.length ? (
          <ul className="ad-sched">{d.schedule.map((r) => (
            <li key={r.code}><b className="ad-t">{fmtTime(r.startMin, 'fa')}</b><span className="ad-sn">{r.name}</span>
              <span className="ad-sm">میز {r.tableId} · {fd(r.guests)} نفر</span><StatusBadge status={r.status} /></li>))}</ul>
        ) : <div className="ad-empty"><b>برای امروز رزروی ثبت نشده</b></div>}
      </section>
    </>
  );
}
