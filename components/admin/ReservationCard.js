import Link from 'next/link';
import { fmt } from '@/lib/jalali';
import { fmtTime, fmtDur } from '@/lib/booking';
import { rd } from '@/lib/reserve-dict';
import { adminI18n } from '@/lib/admin/lang';
import { stampFor } from '@/lib/admin/i18n';
import StatusBadge from './StatusBadge';
import StatusActions from './StatusActions';
import { isLive } from '@/lib/admin/rules';

export default async function ReservationCard({ r, canManage = false }) {
  const { lang, t, n, fill } = await adminI18n();
  const R = rd[lang], C = t.card;
  const when = r.date ? fmt(r.date, lang, { weekday: 'long', day: 'numeric', month: 'long' }) : '—';
  const time = r.startMin != null ? `${fmtTime(r.startMin, lang)} ${t.to} ${fmtTime(r.endMin, lang)}` : '';   // older test data has no start time
  const purpose = R.occ[r.purpose] || R.purposes[r.purpose]?.[0];
  const zone = r.zonePref && r.zonePref !== 'any' ? R.zones[r.zonePref] : '';
  const guests = r.guests ? fill(r.guests === 1 ? t.guest1 : t.guestN, { n: n(r.guests) }) : '';
  return (
    <article id={`rc-${r.code}`} className={`ad-card s-${r.status}`}>
      <header><StatusBadge status={r.status} /><span className="ad-code">{r.code}</span></header>
      <h3 className="ad-name">{r.name}</h3>
      <div className="ad-contact">
        {r.phone && <a href={`tel:${r.phone}`} dir="ltr">{r.phone}</a>}
        {r.email && <a href={`mailto:${r.email}`} dir="ltr">{r.email}</a>}
      </div>
      <div className="ad-when"><b>{when}</b>{time && <span>{time}</span>}{r.durationMin ? <small>{fmtDur(r.durationMin, lang)}</small> : null}</div>
      <ul className="ad-meta">
        <li>🪑 {fill(C.table, { id: r.tableId })}</li>
        {guests ? <li>👥 {guests}</li> : null}
        {purpose && r.purpose !== 'regular' && <li>🎉 {purpose}</li>}
        {r.source === 'owner' && <li>{C.byCafe}</li>}
        {zone && <li>{fill(C.zonePref, { z: zone })}</li>}
      </ul>
      {r.note && <p className="ad-note">{t.quote[0]}{r.note}{t.quote[1]}</p>}
      <footer>
        <small>{fill(C.createdAt, { v: stampFor(lang)(r.createdAt) || '—' })}</small>
        {canManage && <StatusActions code={r.code} status={r.status} />}
        {canManage && isLive(r.status) && <Link className="ad-btn ad-edit" href={`/admin/reservations/${r.code}/edit`}>{C.edit}</Link>}
      </footer>
    </article>
  );
}
