import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { can } from '@/lib/admin/permissions';
import { getReservation } from '@/lib/admin/reservation';
import { LIVE } from '@/lib/admin/rules';
import { STATUS } from '@/lib/admin/labels';
import { cafeNow } from '@/lib/booking';
import ReservationForm from '@/components/admin/ReservationForm';
import StatusBadge from '@/components/admin/StatusBadge';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
export const dynamic = 'force-dynamic';

// /admin/reservations/ABC123/edit : change a pending or confirmed booking (the guest phoned to move it, add a person, ...)
export default async function EditReservationPage({ params }) {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.manage')) return <NoAccess text="ویرایش رزرو نیازمند دسترسی «مدیریت رزروها» است." />;

  const { code } = await params;
  let r;
  try { r = await getReservation(code); } catch (e) { console.error('[admin] edit page:', e?.message); return <DbError />; }
  if (!r) return <div className="ad-empty"><b>این رزرو یافت نشد</b><p><Link href="/admin/reservations">بازگشت به فهرست رزروها</Link></p></div>;
  if (!LIVE.includes(r.status)) return (
    <div className="ad-empty"><b>این رزرو قابل ویرایش نیست</b>
      <p>وضعیت فعلی: {(STATUS[r.status] || [r.status])[0]}. فقط رزروهای «در انتظار تأیید» و «تأیید شده» قابل ویرایش هستند.</p>
      <p><Link href="/admin/reservations">بازگشت به فهرست رزروها</Link></p></div>
  );
  const initial = {
    name: r.name || '', phone: r.phone || '', email: r.email || '', note: r.note || '', guests: r.guests, purpose: r.purpose || 'regular',
    date: r.date, startMin: r.startMin, durationMin: r.durationMin, tableId: r.tableId,
  };
  return (
    <>
      <div className="ad-head"><div><h1>ویرایش رزرو</h1>
        <p className="ad-mut"><span className="ad-code">{r.code}</span> · <StatusBadge status={r.status} /></p></div>
        <Link className="ad-btn" href={`/admin/calendar?d=${r.date}`}>بازگشت</Link></div>
      <ReservationForm mode="edit" code={r.code} initial={initial} today={cafeNow().date} />
    </>
  );
}
