import Link from 'next/link';
import { monthGrid, WEEKDAYS, MONTHS } from '@/lib/jalali-cal';
import { monthSummary } from '@/lib/admin/calendar';
import { fd } from '@/lib/booking';
import DbError from './DbError';

const pad = (n) => String(n).padStart(2, '0');

// The Shamsi month: one cell per day with the number of reservations and an amber dot when something waits for approval.
export default async function MonthGrid({ jy, jm, selected, today }) {
  const { first, last, weeks } = monthGrid(jy, jm);
  let days;
  try { days = await monthSummary(first, last); }
  catch (e) { console.error('[admin] calendar month:', e?.message); return <DbError />; }
  const all = Object.values(days);
  const sum = (k) => all.reduce((a, d) => a + d[k], 0);
  const m = `${jy}-${pad(jm)}`;
  return (
    <>
      <ul className="cal-sum" aria-label="خلاصهٔ این ماه">
        <li><b>{fd(sum('n'))}</b> رزرو</li>
        <li className={sum('pending') ? 'hot' : ''}><b>{fd(sum('pending'))}</b> در انتظار تأیید</li>
        <li><b>{fd(sum('guests'))}</b> میهمان</li>
      </ul>
      <div className="cal-dow" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="cal-grid">
        {weeks.flat().map((c, i) => {
          if (!c) return <span key={`e${i}`} className="cal-cell off" aria-hidden="true" />;
          const d = days[c.iso];
          const cls = ['cal-cell', c.iso === today && 'today', c.iso === selected && 'sel', c.iso < today && 'past', i % 7 === 6 && 'fri', d && 'has'].filter(Boolean).join(' ');
          const label = `${fd(c.jd)} ${MONTHS[jm - 1]}${d ? `، ${fd(d.n)} رزرو${d.pending ? `، ${fd(d.pending)} در انتظار تأیید` : ''}` : '، بدون رزرو'}`;
          return (
            <Link key={c.iso} prefetch={false} href={`/admin/calendar?m=${m}&d=${c.iso}`} className={cls} aria-label={label} aria-current={c.iso === selected ? 'date' : undefined}>
              <span className="cal-d">{fd(c.jd)}</span>
              {d ? <span className="cal-n">{fd(d.n)}</span> : <span className="cal-n none" aria-hidden="true" />}
              {d?.pending ? <i className="cal-p" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </div>
      <p className="cal-legend"><span><i className="cal-p" />در انتظار تأیید</span><span><em>۳</em>تعداد رزرو در آن روز</span></p>
    </>
  );
}
