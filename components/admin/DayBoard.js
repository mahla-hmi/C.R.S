import Link from 'next/link';
import { dayView } from '@/lib/admin/calendar';
import { segFor, pct, hourTicks, isDead } from '@/lib/admin/timeline';
import { cafeNow, addDays, fmtTime, OPEN, CLOSE } from '@/lib/booking';
import { fmt } from '@/lib/jalali';
import { calSys } from '@/lib/calendar-sys';
import { adminI18n } from '@/lib/admin/lang';
import ReservationCard from './ReservationCard';
import DbError from './DbError';
import ScrollToDay from './ScrollToDay';
import JumpToMonth from './JumpToMonth';

const TICKS = hourTicks();
const HOURS = Array.from({ length: Math.floor(CLOSE / 60) - Math.ceil(OPEN / 60) }, (_, i) => Math.ceil(OPEN / 60) + i); // 10..21: one tappable slot per hour
const pad = (n) => String(n).padStart(2, '0');
const Chevron = ({ dir }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={dir === 'prev' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} /></svg>;

// One day: day arrows, how many bookings and guests, a time bar per table (tap a bar to open the booking, tap an empty part to book),
// then the full reservation cards.
export default async function DayBoard({ date, canManage, scroll = false }) {
  const { lang, t, n, fill } = await adminI18n();
  const D = t.day, sys = calSys(lang);
  let v;
  try { v = await dayView(date); }
  catch (e) { console.error('[admin] calendar day:', e?.message); return <DbError />; }
  const now = cafeNow(), isToday = date === now.date;
  const live = v.items.filter((r) => !isDead(r)), dead = v.items.filter(isDead);
  const pending = live.filter((r) => r.status === 'pending').length;
  const guests = live.reduce((a, r) => a + (r.guests || 0), 0);

  // one row per table of the floor plan, plus a row for any table that no longer exists but still has bookings
  const known = new Set(v.tables.map((x) => x.id));
  const rows = v.tables.map((x) => ({ id: x.id, seats: x.seats, zone: x.zone }));
  for (const r of live) if (!known.has(r.tableId)) { known.add(r.tableId); rows.push({ id: r.tableId, seats: null }); }
  const byTable = new Map(rows.map((x) => [x.id, live.filter((r) => r.tableId === x.id)]));
  const used = rows.filter((x) => byTable.get(x.id).length).length;
  const nowPct = isToday && now.min >= OPEN && now.min <= CLOSE ? ((now.min - OPEN) / (CLOSE - OPEN)) * 100 : null;
  const busyNow = (x) => isToday && byTable.get(x.id).some((r) => r.status !== 'completed' && r.status !== 'no_show' && r.startMin <= now.min && now.min < r.endMin);
  const rel = date === now.date ? D.today : date === addDays(now.date, 1) ? D.tomorrow : date === addDays(now.date, -1) ? D.yesterday : '';
  const canBook = canManage && date >= now.date;
  const slotOpen = (h) => date > now.date || (isToday && h * 60 + 60 > now.min); // an hour that is over cannot be booked any more
  const dayHref = (iso) => { const p = sys.parts(iso); return `/admin/calendar?m=${p.y}-${pad(p.m)}&d=${iso}`; };

  return (
    <>
      {scroll && <ScrollToDay />}
      <div className="day-head">
        <Link className="cal-arrow sm" scroll={false} prefetch={false} href={dayHref(addDays(date, -1))} aria-label={D.prevDay}><Chevron dir="prev" /></Link>
        <div className="day-title">
          <h2>{fmt(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          {rel && <span className="day-rel">{rel}</span>}
        </div>
        <Link className="cal-arrow sm" scroll={false} prefetch={false} href={dayHref(addDays(date, 1))} aria-label={D.nextDay}><Chevron dir="next" /></Link>
      </div>
      <div className="day-tools">
        {canBook && <Link className="ad-btn primary" href={`/admin/reservations/new?date=${date}`}>{D.manual}</Link>}
        <JumpToMonth className="ad-btn day-up" label={D.toCal} />
      </div>

      <div className="cal-stats">
        <div className="ad-tile"><span className="ad-n">{n(live.length)}</span><span className="ad-l">{D.stBookings}</span></div>
        <div className={`ad-tile${pending ? ' hot' : ''}`}><span className="ad-n">{n(pending)}</span><span className="ad-l">{D.stPending}</span></div>
        <div className="ad-tile"><span className="ad-n">{n(guests)}</span><span className="ad-l">{D.stGuests}</span></div>
        <div className="ad-tile"><span className="ad-n">{fill(D.of, { a: n(used), b: n(rows.length) })}</span><span className="ad-l">{D.stTables}</span></div>
      </div>

      <section className="ad-sec">
        <div className="ad-sech"><h2>{D.tables}</h2></div>
        <div className="tl" role="table" aria-label={D.tlAria}>
          <div className="tl-axis" aria-hidden="true">
            <span />
            <div className="tl-hours">{TICKS.map((k) => <b key={k.h} style={{ insetInlineStart: k.x + '%' }}>{n(k.h)}</b>)}</div>
          </div>
          {rows.map((x, ri) => {
            const list = byTable.get(x.id);
            return (
              <div className="tl-row" role="row" key={x.id} style={{ '--i': ri }}>
                <div className="tl-name" role="rowheader">
                  <b>{x.id}</b>
                  <small>{x.seats ? fill(D.seats, { n: n(x.seats) }) : D.deleted}</small>
                </div>
                <div className={`tl-track${busyNow(x) ? ' busy' : ''}`} role="cell" aria-label={list.length ? fill(D.bookingsN, { n: n(list.length) }) : D.free}>
                  {canBook && x.seats && HOURS.filter(slotOpen).map((h) => {
                    const title = fill(D.slotTitle, { id: x.id, t: fmtTime(h * 60, lang) });
                    return <Link key={h} prefetch={false} className="tl-slot" style={{ insetInlineStart: pct(h * 60) + '%', inlineSize: pct(h * 60 + 60) - pct(h * 60) + '%' }}
                      href={`/admin/reservations/new?date=${date}&table=${encodeURIComponent(x.id)}&start=${h * 60}`} title={title} aria-label={title} />;
                  })}
                  {list.map((r) => {
                    const s = segFor(r);
                    if (!s) return null;
                    const long = r.endMin - r.startMin >= 120; // wide enough to show the name as well
                    return (
                      <a key={r.code} href={`#rc-${r.code}`} className={`tl-seg s-${r.status}`} style={{ insetInlineStart: s.x + '%', inlineSize: s.w + '%' }}
                        title={`${r.name} · ${fmtTime(r.startMin, lang)} ${t.to} ${fmtTime(r.endMin, lang)} · ${t.status[r.status] || r.status}`}>
                        <b>{n(r.guests)}</b>{long && <span>{r.name}</span>}
                      </a>
                    );
                  })}
                  {!list.length && <em className="tl-free">{D.free}</em>}
                  {nowPct != null && <i className="tl-now" style={{ insetInlineStart: nowPct + '%' }} aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
        <p className="cal-legend">
          <span><i className="tl-key s-confirmed" />{D.kConfirmed}</span><span><i className="tl-key s-pending" />{D.kPending}</span>
          <span><i className="tl-key s-completed" />{D.kDone}</span><span><i className="tl-key s-no_show" />{D.kNoShow}</span>
          {nowPct != null && <span><i className="tl-key now" />{D.kNow}</span>}
        </p>
        {canBook && <p className="cal-hint">{D.slotHint}</p>}
      </section>

      <section className="ad-sec">
        <div className="ad-sech"><h2>{D.list}</h2></div>
        {live.length ? <div className="ad-cards">{live.map((r) => <ReservationCard key={r.code} r={r} canManage={canManage} />)}</div>
          : <div className="ad-empty"><b>{D.empty}</b><p>{date < now.date ? D.emptyPast : D.emptyFuture}</p></div>}
      </section>

      {dead.length > 0 && (
        <details className="cal-dead">
          <summary>{fill(D.dead, { n: n(dead.length) })}</summary>
          <div className="ad-cards">{dead.map((r) => <ReservationCard key={r.code} r={r} canManage={false} />)}</div>
        </details>
      )}
    </>
  );
}
