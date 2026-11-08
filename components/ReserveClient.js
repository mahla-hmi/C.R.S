'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FLOOR_IMAGE } from '@/lib/tables';
import { fmt } from '@/lib/jalali';
import { SlotsSkeleton, FloorSkeleton } from '@/components/Skeleton';
import { pushSupport, subscribeForBooking } from '@/lib/guest-push';
import {
  PURPOSES, ZONES, EMAIL_RE, OPEN, CLOSE, STEP, MAX_GUESTS, cafeNow, bookingDays, earliestStart, isFree,
  stayMinutes, stayFor, autoPick, fmtTime, fmtDur, fd, normDigits,
} from '@/lib/booking';

const BACK_TO_FORM = ['bad_date', 'bad_time', 'too_soon', 'bad_contact', 'bad_email', 'bad_purpose', 'bad_zone'];
const KEY = 'cafe:me'; // name/phone/email remembered on this device only

export default function ReserveClient({ locale, t, special: sp0 }) {
  const fa = locale === 'fa';
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState(sp0 ? 'birthday' : 'regular');
  const [guests, setGuests] = useState(2);
  const [zone, setZone] = useState('any');
  const [days, setDays] = useState([]);
  const [date, setDate] = useState('');
  const [start, setStart] = useState(null);
  const [note, setNote] = useState('');
  const [avail, setAvail] = useState(null); // tables with their busy ranges for `date`
  const [rk, setRk] = useState(0);          // bump to re-fetch availability
  const [tableId, setTableId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [canPush, setCanPush] = useState(false); // this browser can show notifications (and has not blocked them)
  const [wantPush, setWantPush] = useState(true);

  useEffect(() => {
    const d = bookingDays(); setDays(d); setDate(d[0]);
    setCanPush(pushSupport() === 'ok');
    try { const m = JSON.parse(localStorage.getItem(KEY) || 'null'); if (m) { setName(m.name || ''); setPhone(m.phone || ''); setEmail(m.email || ''); } } catch {}
  }, []);

  useEffect(() => {
    if (!date) return;
    let off = false;
    setAvail(null);
    fetch(`/api/tables?date=${date}`)
      .then(async (r) => { const j = await r.json(); if (off) return; if (r.ok) { setAvail(j.tables); setErr((e) => (e === 'db' ? '' : e)); } else setErr('db'); })
      .catch(() => { if (!off) setErr('db'); });
    return () => { off = true; };
  }, [date, rk]);

  // ---- availability, all computed from the busy ranges. The stay length is an estimate, never asked. ----
  const earliest = date ? earliestStart(date, cafeNow()) : OPEN;
  const starts = []; for (let s = OPEN; s + STEP <= CLOSE; s += STEP) starts.push(s);
  const stayAt = (s) => stayFor(purpose, guests, s);
  const fitsIn = (z) => (s) => !!avail && s >= earliest
    && avail.some((x) => x.seats >= guests && (z === 'any' || x.zone === z) && isFree(x.busy, s, stayAt(s)));
  const fits = fitsIn(zone), fitsAny = fitsIn('any');
  const okStart = start !== null && fits(start) ? start : null;
  const dur = start !== null ? stayAt(start) : stayMinutes(purpose, guests);
  const range = start !== null ? `${fmtTime(start, locale)} ${t.to} ${fmtTime(start + dur, locale)}` : '';
  const when = date && fmt(date, locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const n = (x) => (fa ? fd(x) : x);
  const guestLabel = (g) => (g === 1 ? t.solo : t.guestN.replace('{n}', n(g)));
  const tableOk = (id) => { const x = avail?.find((a) => a.id === id); return !!x && start !== null && x.seats >= guests && isFree(x.busy, start, stayAt(start)); };

  // table step: suggest the best table; if the time vanished meanwhile, go back
  useEffect(() => {
    if (step !== 1 || !avail || start === null || done) return;
    if (!fitsAny(start)) { setStep(0); setErr('gone'); return; }
    if (!tableId || !tableOk(tableId)) setTableId(autoPick(avail, { guests, zone, start, dur: stayAt(start) }) || '');
  }, [step, avail, start, tableId]);

  const msg = err && (t.errors[err] || t.errors.generic);
  const clr = () => setErr((e) => (e === 'db' ? e : ''));
  const goTables = () => {
    if (name.trim().length < 2) return setErr('need_name');
    if (normDigits(phone).replace(/\D/g, '').length < 7) return setErr('need_phone');
    if (email.trim() && !EMAIL_RE.test(email.trim())) return setErr('bad_email');
    if (okStart === null) return setErr('need_time');
    setErr(''); setTableId(''); setRk((k) => k + 1); setStep(1);
  };
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      // asked here, inside the tap on "Reserve", because browsers only show the permission question after a user action
      const push = canPush && wantPush ? await subscribeForBooking() : null;
      const r = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, startMin: start, purpose, guests, zone, tableId, name, email, phone, note, locale, ...(push ? { push } : {}) }) });
      const j = await r.json();
      if (r.ok) { setDone({ code: j.code, endMin: j.endMin, pushed: !!push }); try { localStorage.setItem(KEY, JSON.stringify({ name, phone, email })); } catch {} }
      else if (j.error === 'taken') { setTableId(''); setRk((k) => k + 1); setErr('taken'); }  // the effect above suggests another table
      else if (BACK_TO_FORM.includes(j.error)) { setRk((k) => k + 1); setStep(0); setErr(j.error); }
      else setErr(j.error);
    } catch { setErr('db'); }
    setBusy(false);
  };

  if (done) return (
    <div className="wrap rs-box donebox">
      <svg viewBox="0 0 52 52" className="tick"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
      <h2>{t.ok}</h2><p>{t.okSub}</p><b className="code">{done.code}</b>
      <p className="mut">{when} · {fmtTime(start, locale)} {t.to} {fmtTime(done.endMin, locale)} · {tableId}</p>
      {done.pushed && <p className="rs-hint push-on">{t.pushOn}</p>}
      <p className="rs-hint">{t.smsNote}</p>
      <div className="dn-act"><Link href={`/${locale}/my`} className="btn">{t.myCta}</Link><Link href={`/${locale}`} className="btn ghost">{t.home}</Link></div>
    </div>
  );
  return (
    <div className="wrap rs-box">
      <h1 className="rs-h">{t.title}</h1>
      <p className="mut rs-sub">{t.sub}</p>
      <ol className="prog">{t.steps.map((s, i) => <li key={s} className={i <= step ? 'on' : ''}><span>{i + 1}</span>{s}</li>)}</ol>
      <div key={step} className="pane">
        {step === 0 && <>
          <div className="fgrid">
            <label className="m2">{t.name}<input value={name} onChange={(e) => { setName(e.target.value); clr(); }} autoComplete="name" /></label>
            <label className="m2">{t.email}<input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clr(); }} inputMode="email" dir="ltr" autoComplete="email" /></label>
            <label className="m2">{t.phone}<input value={phone} onChange={(e) => { setPhone(e.target.value); clr(); }} inputMode="tel" dir="ltr" autoComplete="tel" /></label>
            <label className="m2">{t.occasion}<select value={purpose} onChange={(e) => setPurpose(e.target.value)}>{Object.keys(PURPOSES).map((k) => <option key={k} value={k}>{t.occ[k]}</option>)}</select></label>
            <label>{t.guests}<select value={guests} onChange={(e) => setGuests(+e.target.value)}>{Array.from({ length: MAX_GUESTS }, (_, i) => i + 1).map((g) => <option key={g} value={g}>{guestLabel(g)}</option>)}</select></label>
            <label>{t.zone}<select value={zone} onChange={(e) => setZone(e.target.value)}>{ZONES.map((z) => <option key={z} value={z}>{t.zones[z]}</option>)}</select></label>
          </div>
          <div className="lbl">{t.date}</div>
          <div className="days">{days.map((d) => <button key={d} className={date === d ? 'sel' : ''} onClick={() => { setDate(d); setStart(null); clr(); }}><small>{fmt(d, locale, { weekday: 'short' })}</small><b>{fmt(d, locale, { day: 'numeric' })}</b><small>{fmt(d, locale, { month: 'short' })}</small></button>)}</div>
          <div className="lbl">{t.start}</div>
          {!avail && !err && <SlotsSkeleton label={t.loading} />}
          {avail && <div className="fx">
            <div className="slots t4">{starts.map((s) => <button key={s} disabled={!fits(s)} className={okStart === s ? 'sel' : ''} onClick={() => { setStart(s); clr(); }}>{fmtTime(s, locale)}</button>)}</div>
            {!starts.some(fits) && <p className="rs-hint">{zone !== 'any' && starts.some(fitsAny) ? t.tryAny : t.noStart}</p>}
          </div>}
          {okStart !== null && <p className="rs-hint">{(dur < stayMinutes(purpose, guests) ? t.stayCap : t.stayHint).replace('{d}', fmtDur(dur, locale)).replace('{c}', fmtTime(CLOSE, locale))}</p>}
          <label>{t.note.replace('…', '')}<textarea rows="3" placeholder={t.note} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {msg && <p className="err">{msg}</p>}
          <button className="btn full" onClick={goTables}>{t.next}</button>
        </>}
        {step === 1 && <>
          <p className="sum">{when} · {range} · {guestLabel(guests)}</p>
          {avail && <p className="mut center">{t.pickAuto}</p>}
          {msg && <p className="err">{msg}</p>}
          {!avail && !err && <FloorSkeleton label={t.loading} />}
          {avail && <div className={`floor fx${FLOOR_IMAGE ? ' img' : ''}`} style={FLOOR_IMAGE ? { backgroundImage: `url(${FLOOR_IMAGE})` } : undefined}>{avail.map((x, i) => {
            const taken = start === null || !isFree(x.busy, start, stayAt(start)), small = x.seats < guests, off = taken || small;
            return <button key={x.id} disabled={off} style={{ left: x.x + '%', top: x.y + '%', '--i': i }}
              className={`tb ${taken ? 'bk' : small ? 'sm' : ''} ${tableId === x.id ? 'sel' : ''}`} onClick={() => { setTableId(x.id); clr(); }}>
              <b>{x.id}</b><small>{x.seats} {t.seats}</small></button>;
          })}</div>}
          {avail && <div className="legend"><span className="l1">{t.free}</span><span className="l2">{t.booked}</span><span className="l3">{t.small}</span></div>}
          {avail && canPush && <label className="pushopt"><input type="checkbox" checked={wantPush} onChange={(e) => setWantPush(e.target.checked)} /><span><b>{t.pushLabel}</b><small>{t.pushHint}</small></span></label>}
          <div className="nav2"><button className="btn ghost" onClick={() => { setErr(''); setStep(0); }}>{t.prev}</button><button className="btn" disabled={busy || !tableId} onClick={submit}>{t.submit}</button></div>
        </>}
      </div>
    </div>
  );
}
