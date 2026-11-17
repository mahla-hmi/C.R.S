import Link from 'next/link';
import { calSys } from '@/lib/calendar-sys';
import { monthSummary } from '@/lib/admin/calendar';
import { adminI18n } from '@/lib/admin/lang';
import DbError from './DbError';

const pad = (n) => String(n).padStart(2, '0');

// One month (Shamsi for Persian, Gregorian for English). Every day is a small card:
// the day number, a coloured bar (green confirmed / amber pending / grey finished) and the number of bookings.
// Busier days get a stronger green tint, so the quiet and the busy days can be told apart at a glance.
export default async function MonthGrid({ y, m, selected, today }) {
  const { lang, t, n, fill } = await adminI18n();
  const C = t.cal, sys = calSys(lang);
  const { first, last, weeks } = sys.grid(y, m);
  let days;
  try { days = await monthSummary(first, last); }
  catch (e) { console.error('[admin] calendar month:', e?.message); return <DbError />; }
  const all = Object.values(days);
  const sum = (k) => all.reduce((a, d) => a + d[k], 0);
  const peak = Math.max(1, ...all.map((d) => d.n));
  const ym = `${y}-${pad(m)}`;
  return (
    <>
      <ul className="cal-sum" aria-label={C.sumAria}>
        <li><b>{n(sum('n'))}</b><span>{C.sumBookings}</span></li>
        <li className={sum('pending') ? 'hot' : ''}><b>{n(sum('pending'))}</b><span>{C.sumPending}</span></li>
        <li><b>{n(sum('guests'))}</b><span>{C.sumGuests}</span></li>
      </ul>
      <div className="cal-dow" aria-hidden="true">{sys.WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {weeks.flat().map((c, i) => {
          if (!c) return <span key={`e${i}`} className="cal-cell off" aria-hidden="true" />;
          const d = days[c.iso];
          const cls = ['cal-cell', c.iso === today && 'today', c.iso === selected && 'sel', c.iso < today && 'past', i % 7 === 6 && 'fri', d && 'has'].filter(Boolean).join(' ');
          const parts = d ? [fill(C.cellN, { n: n(d.n) }), d.pending ? fill(C.cellPending, { n: n(d.pending) }) : null].filter(Boolean) : [C.cellNone];
          const label = `${n(c.jd)} ${sys.MONTHS[m - 1]}${C.sep}${parts.join(C.sep)}`;
          return (
            <Link key={c.iso} prefetch={false} href={`/admin/calendar?m=${ym}&d=${c.iso}`} className={cls} style={{ '--i': i, ...(d ? { '--h': d.n / peak } : {}) }} aria-label={label} aria-current={c.iso === selected ? 'date' : undefined}>
              <span className="cal-d">{n(c.jd)}</span>
              <span className="cal-bar" aria-hidden="true">
                {d && <>{d.confirmed ? <i className="c" style={{ flexGrow: d.confirmed }} /> : null}{d.pending ? <i className="p" style={{ flexGrow: d.pending }} /> : null}{d.done ? <i className="x" style={{ flexGrow: d.done }} /> : null}</>}
              </span>
              <span className="cal-n">{d ? n(d.n) : ''}</span>
            </Link>
          );
        })}
      </div>
      <p className="cal-legend"><span><i className="tl-key s-confirmed" />{t.day.kConfirmed}</span><span><i className="tl-key s-pending" />{C.legendPending}</span><span><i className="tl-key s-completed" />{t.day.kDone}</span></p>
    </>
  );
}
