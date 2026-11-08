import Link from 'next/link';
import { dayView } from '@/lib/admin/calendar';
import { segFor, hourTicks, isDead } from '@/lib/admin/timeline';
import { cafeNow, addDays, fd, fmtTime, OPEN, CLOSE } from '@/lib/booking';
import { fmt } from '@/lib/jalali';
import { STATUS } from '@/lib/admin/labels';
import ReservationCard from './ReservationCard';
import DbError from './DbError';
import ScrollToDay from './ScrollToDay';

const REL = (date, today) => (date === today ? 'امروز' : date === addDays(today, 1) ? 'فردا' : date === addDays(today, -1) ? 'دیروز' : '');
const TICKS = hourTicks();

// One day: how many bookings and guests, a time axis per table (who sits where and when), then the full reservation cards.
export default async function DayBoard({ date, canManage, scroll = false }) {
  let v;
  try { v = await dayView(date); }
  catch (e) { console.error('[admin] calendar day:', e?.message); return <DbError />; }
  const now = cafeNow(), isToday = date === now.date;
  const live = v.items.filter((r) => !isDead(r)), dead = v.items.filter(isDead);
  const pending = live.filter((r) => r.status === 'pending').length;
  const guests = live.reduce((a, r) => a + (r.guests || 0), 0);

  // one row per table of the floor plan, plus a row for any table that no longer exists but still has bookings
  const known = new Set(v.tables.map((t) => t.id));
  const rows = v.tables.map((t) => ({ id: t.id, seats: t.seats, zone: t.zone }));
  for (const r of live) if (!known.has(r.tableId)) { known.add(r.tableId); rows.push({ id: r.tableId, seats: null }); }
  const byTable = new Map(rows.map((t) => [t.id, live.filter((r) => r.tableId === t.id)]));
  const used = rows.filter((t) => byTable.get(t.id).length).length;
  const nowPct = isToday && now.min >= OPEN && now.min <= CLOSE ? ((now.min - OPEN) / (CLOSE - OPEN)) * 100 : null;
  const busyNow = (t) => isToday && byTable.get(t.id).some((r) => r.status !== 'completed' && r.status !== 'no_show' && r.startMin <= now.min && now.min < r.endMin);
  const rel = REL(date, now.date);

  return (
    <>
      {scroll && <ScrollToDay />}
      <div className="ad-sech">
        <div>
          <h2>{fmt(date, 'fa', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          {rel && <p className="ad-mut">{rel}</p>}
        </div>
        {canManage && date >= now.date && <Link className="ad-btn primary" href={`/admin/reservations/new?date=${date}`}>+ رزرو دستی</Link>}
      </div>

      <div className="cal-stats">
        <div className="ad-tile"><span className="ad-n">{fd(live.length)}</span><span className="ad-l">رزرو</span></div>
        <div className={`ad-tile${pending ? ' hot' : ''}`}><span className="ad-n">{fd(pending)}</span><span className="ad-l">در انتظار تأیید</span></div>
        <div className="ad-tile"><span className="ad-n">{fd(guests)}</span><span className="ad-l">میهمان</span></div>
        <div className="ad-tile"><span className="ad-n">{fd(used)}<small> از {fd(rows.length)}</small></span><span className="ad-l">میز درگیر</span></div>
      </div>

      <section className="ad-sec">
        <div className="ad-sech"><h2>وضعیت میزها</h2></div>
        <div className="tl" role="table" aria-label="وضعیت میزها در ساعت‌های روز">
          <div className="tl-axis" aria-hidden="true">
            <span />
            <div className="tl-hours">{TICKS.map((t) => <b key={t.h} style={{ insetInlineStart: t.x + '%' }}>{fd(t.h)}</b>)}</div>
          </div>
          {rows.map((t) => {
            const list = byTable.get(t.id);
            return (
              <div className="tl-row" role="row" key={t.id}>
                <div className="tl-name" role="rowheader">
                  <b>{t.id}</b>
                  <small>{t.seats ? `${fd(t.seats)} نفره` : 'حذف‌شده'}</small>
                </div>
                <div className={`tl-track${busyNow(t) ? ' busy' : ''}`} role="cell" aria-label={list.length ? `${fd(list.length)} رزرو` : 'آزاد'}>
                  {list.map((r) => {
                    const s = segFor(r);
                    if (!s) return null;
                    return <span key={r.code} className={`tl-seg s-${r.status}`} style={{ insetInlineStart: s.x + '%', inlineSize: s.w + '%' }}
                      title={`${r.name} · ${fmtTime(r.startMin, 'fa')} تا ${fmtTime(r.endMin, 'fa')} · ${(STATUS[r.status] || [r.status])[0]}`} />;
                  })}
                  {!list.length && <em className="tl-free">آزاد</em>}
                  {nowPct != null && <i className="tl-now" style={{ insetInlineStart: nowPct + '%' }} aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
        <p className="cal-legend">
          <span><i className="tl-key s-confirmed" />تأیید شده</span><span><i className="tl-key s-pending" />در انتظار تأیید</span>
          <span><i className="tl-key s-completed" />انجام شد</span><span><i className="tl-key s-no_show" />کنسلی</span>
          {nowPct != null && <span><i className="tl-key now" />اکنون</span>}
        </p>
      </section>

      <section className="ad-sec">
        <div className="ad-sech"><h2>رزروهای این روز</h2></div>
        {live.length ? <div className="ad-cards">{live.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
          : <div className="ad-empty"><b>برای این روز رزروی ثبت نشده است</b><p>{date < now.date ? 'در این روز رزروی وجود نداشته است.' : 'همهٔ میزها برای این روز آزاد هستند.'}</p></div>}
      </section>

      {dead.length > 0 && (
        <details className="cal-dead">
          <summary>لغو شده و ردشده ({fd(dead.length)})</summary>
          <div className="ad-cards">{dead.map((r) => <ReservationCard key={r.code} r={r} canManage={false} />)}</div>
        </details>
      )}
    </>
  );
}
