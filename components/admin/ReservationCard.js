import Link from 'next/link';
import { fmt } from '@/lib/jalali';
import { fmtTime, fmtDur, fd } from '@/lib/booking';
import { rd } from '@/lib/reserve-dict';
import StatusBadge from './StatusBadge';
import StatusActions from './StatusActions';
import { isLive } from '@/lib/admin/rules';

const R = rd.fa;
const created = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });

export default function ReservationCard({ r, canManage = false }) {
  const when = r.date ? fmt(r.date, 'fa', { weekday: 'long', day: 'numeric', month: 'long' }) : '—';
  const time = r.startMin != null ? `${fmtTime(r.startMin, 'fa')} تا ${fmtTime(r.endMin, 'fa')}` : '';   // older test data has no start time
  const purpose = R.occ[r.purpose] || R.purposes[r.purpose]?.[0];
  const zone = r.zonePref && r.zonePref !== 'any' ? R.zones[r.zonePref] : '';
  return (
    <article className={`ad-card s-${r.status}`}>
      <header><StatusBadge status={r.status} /><span className="ad-code">{r.code}</span></header>
      <h3 className="ad-name">{r.name}</h3>
      <div className="ad-contact">
        {r.phone && <a href={`tel:${r.phone}`} dir="ltr">{r.phone}</a>}
        {r.email && <a href={`mailto:${r.email}`} dir="ltr">{r.email}</a>}
      </div>
      <div className="ad-when"><b>{when}</b>{time && <span>{time}</span>}{r.durationMin ? <small>{fmtDur(r.durationMin, 'fa')}</small> : null}</div>
      <ul className="ad-meta">
        <li>🪑 میز {r.tableId}</li>
        {r.guests ? <li>👥 {fd(r.guests)} نفر</li> : null}
        {purpose && r.purpose !== 'regular' && <li>🎉 {purpose}</li>}
        {r.source === 'owner' && <li>☎️ ثبت‌شده توسط کافه</li>}
        {zone && <li>📍 ترجیح محل نشستن: {zone}</li>}
      </ul>
      {r.note && <p className="ad-note">«{r.note}»</p>}
      <footer>
        <small>زمان ثبت: {r.createdAt ? created.format(new Date(r.createdAt)) : '—'}</small>
        {canManage && <StatusActions code={r.code} status={r.status} />}
        {canManage && isLive(r.status) && <Link className="ad-btn ad-edit" href={`/admin/reservations/${r.code}/edit`}>ویرایش رزرو</Link>}
      </footer>
    </article>
  );
}
