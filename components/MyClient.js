'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fmt } from '@/lib/jalali';
import { CardsSkeleton } from '@/components/Skeleton';
import { PURPOSES, cafeNow, fmtTime, fmtDur, fd } from '@/lib/booking';

const KEY = 'cafe:me'; // remembered on this device only, to prefill the form

export default function MyClient({ locale, t, r }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    try { const m = JSON.parse(localStorage.getItem(KEY) || 'null'); if (m) { setName(m.name || ''); setPhone(m.phone || ''); } } catch {}
  }, []);

  const find = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setItems(null);
    try {
      const res = await fetch('/api/my-reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) });
      const j = await res.json();
      if (res.ok) { setItems(j.items); if (j.items.length) { try { localStorage.setItem(KEY, JSON.stringify({ name, phone })); } catch {} } }
      else setErr(j.error);
    } catch { setErr('db'); }
    setBusy(false);
  };

  const now = items ? cafeNow() : null;
  const isPast = (x) => x.date < now.date || (x.date === now.date && x.endMin <= now.min);
  const up = items ? items.filter((x) => !isPast(x)).reverse() : [];   // API sends newest first
  const past = items ? items.filter(isPast) : [];
  const guests = (n) => (locale === 'fa' ? `${fd(n)} نفر` : `${n} guest${n > 1 ? 's' : ''}`);

  const Card = ({ x, old }) => (
    <article className={`mr-card${old ? ' old' : ''}`}>
      <header>
        <span className="mr-when">{fmt(x.date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <span className={`mr-st st-${t.status[x.status] ? x.status : 'pending'}`}>{t.status[x.status] || t.status.pending}</span>
      </header>
      <p className="mr-time">{fmtTime(x.startMin, locale)} {r.to} {fmtTime(x.endMin, locale)}<small> · {fmtDur(x.durationMin, locale)}</small></p>
      <ul className="mr-meta">
        <li>🪑 {t.table} {x.tableId}</li>
        <li>👥 {guests(x.guests)}</li>
        {r.purposes[x.purpose] && PURPOSES[x.purpose] && <li>{PURPOSES[x.purpose].icon} {r.purposes[x.purpose][0]}</li>}
      </ul>
      {x.note && <p className="mr-note">{x.note}</p>}
      <p className="mr-code">{t.code}: <b>{x.code}</b></p>
    </article>
  );

  return (
    <div className="wrap rs-box">
      <h1 className="rs-h">{t.title}</h1>
      <p className="mut mr-lead">{t.lead}</p>
      <form className="pane" onSubmit={find}>
        <label>{t.name}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label>{t.phone}<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" autoComplete="tel" /></label>
        {err && <p className="err">{t.errors[err] || t.errors.generic}</p>}
        <button className="btn full" type="submit" disabled={busy || name.trim().length < 2 || phone.length < 7}>{busy ? t.finding : t.find}</button>
      </form>
      {busy && <CardsSkeleton label={t.finding} />}
      {items && (items.length === 0 ? (
        <div className="mr-empty fx"><p>{t.empty}</p><Link href={`/${locale}/reserve`} className="btn ghost">{t.book}</Link></div>
      ) : (
        <div className="mr-list fx">
          {up.length > 0 && <><h2>{t.upcoming}</h2>{up.map((x) => <Card key={x.code} x={x} />)}</>}
          {past.length > 0 && <><h2>{t.past}</h2>{past.map((x) => <Card key={x.code} x={x} old />)}</>}
        </div>
      ))}
    </div>
  );
}
