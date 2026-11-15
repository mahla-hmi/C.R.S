import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { can } from '@/lib/admin/permissions';
import { cafeNow, addDays, isValidDate, stayFor, OPEN, CLOSE, STEP } from '@/lib/booking';
import ReservationForm from '@/components/admin/ReservationForm';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
export const dynamic = 'force-dynamic';

// /admin/reservations/new?date=YYYY-MM-DD : the cafe books a table for a guest (phone call, walk-in)
export default async function NewReservationPage({ searchParams }) {
  const { t } = await adminI18n();
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'reservations.manage')) return <NoAccess text={t.noAccess.create} />;

  const sp = await searchParams;
  const now = cafeNow();
  let date = isValidDate(sp?.date) && sp.date >= now.date ? sp.date : now.date;
  let startMin = date === now.date ? Math.max(OPEN, Math.ceil(now.min / STEP) * STEP) : OPEN;
  if (startMin > CLOSE - STEP) { date = addDays(now.date, 1); startMin = OPEN; } // after closing time: start from tomorrow
  // a tapped free slot of the calendar brings its own table and hour
  const want = Number(sp?.start);
  if (sp?.date && date === sp.date && Number.isInteger(want) && want % STEP === 0 && want >= OPEN && want <= CLOSE - STEP && (date !== now.date || want >= Math.floor(now.min / STEP) * STEP)) startMin = want;
  const tableId = /^[A-Za-z0-9_-]{1,12}$/.test(String(sp?.table || '')) ? sp.table : 'auto'; // the form falls back to automatic if it does not fit
  const guests = 2;
  const initial = { name: '', phone: '', email: '', note: '', guests, purpose: 'regular', date, startMin, durationMin: stayFor('regular', guests, startMin), tableId };
  return (
    <>
      <div className="ad-head"><div><h1>{t.newPage.title}</h1><p className="ad-mut">{t.newPage.sub}</p></div>
        <Link className="ad-btn" href="/admin/reservations">{t.newPage.back}</Link></div>
      <ReservationForm mode="create" initial={initial} today={now.date} />
    </>
  );
}
