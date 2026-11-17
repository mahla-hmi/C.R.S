import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { can } from '@/lib/admin/permissions';
import { getReservation } from '@/lib/admin/reservation';
import { LIVE } from '@/lib/admin/rules';
import { cafeNow } from '@/lib/booking';
import ReservationForm from '@/components/admin/ReservationForm';
import StatusBadge from '@/components/admin/StatusBadge';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
export const dynamic = 'force-dynamic';

// /admin/reservations/ABC123/edit : change a pending or confirmed booking (the guest phoned to move it, add a person, ...)
export default async function EditReservationPage({ params }) {
  const { t, fill } = await adminI18n();
  const E = t.editPage;
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.manage')) return <NoAccess text={t.noAccess.edit} />;

  const { code } = await params;
  let r;
  try { r = await getReservation(code); } catch (e) { console.error('[admin] edit page:', e?.message); return <DbError />; }
  if (!r) return <div className="ad-empty"><b>{E.notFound}</b><p><Link href="/admin/reservations">{E.backList}</Link></p></div>;
  if (!LIVE.includes(r.status)) return (
    <div className="ad-empty"><b>{E.notEditable}</b>
      <p>{fill(E.notEditableSub, { s: t.status[r.status] || r.status })}</p>
      <p><Link href="/admin/reservations">{E.backList}</Link></p></div>
  );
  const initial = {
    name: r.name || '', phone: r.phone || '', email: r.email || '', note: r.note || '', guests: r.guests, purpose: r.purpose || 'regular',
    date: r.date, startMin: r.startMin, durationMin: r.durationMin, tableId: r.tableId,
  };
  return (
    <>
      <div className="ad-head"><div><h1>{E.title}</h1>
        <p className="ad-mut"><span className="ad-code">{r.code}</span> · <StatusBadge status={r.status} /></p></div>
        <Link className="ad-btn" href={`/admin/calendar?d=${r.date}`}>{E.back}</Link></div>
      <ReservationForm mode="edit" code={r.code} initial={initial} today={cafeNow().date} />
    </>
  );
}
