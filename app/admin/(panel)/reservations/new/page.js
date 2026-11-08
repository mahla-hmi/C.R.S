import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { can } from '@/lib/admin/permissions';
import { cafeNow, addDays, isValidDate, stayFor, OPEN, CLOSE, STEP } from '@/lib/booking';
import ReservationForm from '@/components/admin/ReservationForm';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
export const dynamic = 'force-dynamic';

// /admin/reservations/new?date=YYYY-MM-DD : the cafe books a table for a guest (phone call, walk-in)
export default async function NewReservationPage({ searchParams }) {
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.manage')) return <NoAccess text="ثبت رزرو دستی نیازمند دسترسی «مدیریت رزروها» است." />;

  const sp = await searchParams;
  const now = cafeNow();
  let date = isValidDate(sp?.date) && sp.date >= now.date ? sp.date : now.date;
  let startMin = date === now.date ? Math.max(OPEN, Math.ceil(now.min / STEP) * STEP) : OPEN;
  if (startMin > CLOSE - STEP) { date = addDays(now.date, 1); startMin = OPEN; } // after closing time: start from tomorrow
  const guests = 2;
  const initial = { name: '', phone: '', email: '', note: '', guests, purpose: 'regular', date, startMin, durationMin: stayFor('regular', guests, startMin), tableId: 'auto' };
  return (
    <>
      <div className="ad-head"><div><h1>رزرو دستی</h1><p className="ad-mut">ثبت رزرو برای میهمانی که تلفنی یا حضوری درخواست داده است.</p></div>
        <Link className="ad-btn" href="/admin/reservations">بازگشت</Link></div>
      <ReservationForm mode="create" initial={initial} today={now.date} />
    </>
  );
}
