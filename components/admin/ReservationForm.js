'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OPEN, CLOSE, STEP, PURPOSES, MAX_GUESTS, cafeNow, isFree, stayFor, fmtTime, fmtDur } from '@/lib/booking';
import { calSys } from '@/lib/calendar-sys';
import { fmt } from '@/lib/jalali';
import { rd } from '@/lib/reserve-dict';
import { useAdmin } from './LangProvider';

const SLOTS = Array.from({ length: (CLOSE - OPEN) / STEP }, (_, i) => OPEN + i * STEP);

// Date picker: day / month / year in the panel's calendar (Shamsi for Persian, Gregorian for English).
// Value and onChange always use ISO (Gregorian) strings, like everything else.
function DateSelect({ value, onChange, today, lang, n, F }) {
  const sys = calSys(lang), T = sys.parts(today), J = sys.parts(value);
  const years = [...new Set([T.y, T.y + 1, J.y])].sort();
  const set = (y, m, d) => { const iso = sys.make(y, m, Math.min(d, sys.len(y, m))); onChange(iso < today ? today : iso); };
  return (
    <div className="rf-date">
      <select aria-label={F.day} value={J.d} onChange={(e) => set(J.y, J.m, +e.target.value)}>{Array.from({ length: sys.len(J.y, J.m) }, (_, i) => <option key={i + 1} value={i + 1}>{n(i + 1)}</option>)}</select>
      <select aria-label={F.month} value={J.m} onChange={(e) => set(J.y, +e.target.value, J.d)}>{sys.MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
      <select aria-label={F.year} value={J.y} onChange={(e) => set(+e.target.value, J.m, J.d)}>{years.map((y) => <option key={y} value={y}>{n(y)}</option>)}</select>
    </div>
  );
}

// mode "create": a new booking taken by phone / at the door. mode "edit": change an existing live booking.
export default function ReservationForm({ mode = 'create', initial, code = '', today }) {
  const router = useRouter();
  const { lang, t, n, fill } = useAdmin();
  const F = t.form, R = rd[lang];
  const edit = mode === 'edit';
  const [f, setF] = useState(initial);
  const [durTouched, setDurTouched] = useState(edit);
  const [avail, setAvail] = useState(null);
  const [status, setStatus] = useState('confirmed');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const up = (patch) => { setErr(''); setF((p) => ({ ...p, ...patch })); };
  const guestLabel = (g) => fill(g === 1 ? t.guest1 : t.guestN, { n: n(g) });

  // tables with their occupied ranges for the chosen day (the booking being edited does not block itself)
  useEffect(() => {
    let off = false;
    setAvail(null);
    fetch(`/api/admin/availability?date=${f.date}${edit ? `&exclude=${code}` : ''}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (off) return; if (r.ok) setAvail(j.tables); else { if (r.status === 401) window.location.href = '/admin/login'; setErr(F.errors[j.error] || F.errors.db); } })
      .catch(() => { if (!off) setErr(F.errors.db); });
    return () => { off = true; };
  }, [f.date, code, edit]); // eslint-disable-line react-hooks/exhaustive-deps

  // suggested stay: from the occasion and party size, unless the person chose a length themselves
  useEffect(() => { if (!durTouched) setF((p) => ({ ...p, durationMin: stayFor(p.purpose, p.guests, p.startMin) })); }, [durTouched, f.purpose, f.guests, f.startMin]);
  // the stay can never run past closing time
  useEffect(() => { if (f.startMin + f.durationMin > CLOSE) setF((p) => ({ ...p, durationMin: CLOSE - p.startMin })); }, [f.startMin, f.durationMin]);

  const now = useMemo(() => cafeNow(), []);
  const slotOk = (s) => f.date > now.date || (f.date === now.date ? s >= Math.floor(now.min / STEP) * STEP : true) || (edit && f.date === initial.date && s === initial.startMin);
  const fits = (x) => x.seats >= f.guests && isFree(x.busy, f.startMin, f.durationMin);
  const free = avail ? avail.filter(fits) : null;
  const sel = f.tableId !== 'auto' ? avail?.find((x) => x.id === f.tableId) : null;
  // a chosen table that stops being free (other time, more guests) falls back to automatic choice
  useEffect(() => { if (avail && f.tableId !== 'auto' && !(sel && fits(sel))) setF((p) => ({ ...p, tableId: 'auto' })); }); // eslint-disable-line react-hooks/exhaustive-deps

  const maxDur = CLOSE - f.startMin;
  const durations = Array.from({ length: maxDur / STEP }, (_, i) => (i + 1) * STEP);
  const canSubmit = !busy && f.name.trim().length >= 2 && f.phone.trim().length >= 7 && avail && (f.tableId !== 'auto' || (free && free.length > 0));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = { ...f, notify, ...(edit ? {} : { status }) };
      const r = await fetch(edit ? `/api/admin/reservations/${encodeURIComponent(code)}` : '/api/admin/reservations', { method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 401) { window.location.href = '/admin/login'; return; }
      const j = await r.json().catch(() => ({}));
      if (r.ok) { router.push(`/admin/calendar?d=${f.date}`); router.refresh(); return; }
      setErr(F.errors[j.error] || F.errors.failed);
    } catch { setErr(F.errors.net); }
    setBusy(false);
  };

  return (
    <form className="rf" onSubmit={submit}>
      <fieldset className="rf-card">
        <legend>{F.guestInfo}</legend>
        <label className="ad-field">{F.fullName}<input value={f.name} onChange={(e) => up({ name: e.target.value })} autoComplete="off" maxLength={60} required /></label>
        <label className="ad-field">{F.phone}<input type="tel" inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => up({ phone: e.target.value })} autoComplete="off" placeholder="09121234567" required /></label>
        <label className="ad-field">{F.email}<input type="email" dir="ltr" value={f.email} onChange={(e) => up({ email: e.target.value })} autoComplete="off" /></label>
      </fieldset>

      <fieldset className="rf-card">
        <legend>{F.timeGuests}</legend>
        <div className="ad-field">{F.date}
          <DateSelect value={f.date} today={today} lang={lang} n={n} F={F} onChange={(date) => up({ date })} />
          <small className="ad-mut">{fmt(f.date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{f.date === today && ` · ${F.today}`}</small>
        </div>
        <div className="rf-two">
          <label className="ad-field">{F.start}
            <select value={f.startMin} onChange={(e) => up({ startMin: +e.target.value })}>
              {SLOTS.map((s) => <option key={s} value={s} disabled={!slotOk(s)}>{fmtTime(s, lang)}</option>)}
            </select>
          </label>
          <label className="ad-field">{F.stay}
            <select value={f.durationMin} onChange={(e) => { setDurTouched(true); up({ durationMin: +e.target.value }); }}>
              {durations.map((d) => <option key={d} value={d}>{fmtDur(d, lang)}</option>)}
            </select>
          </label>
        </div>
        <small className="ad-mut">{fill(F.leaves, { t: fmtTime(f.startMin + f.durationMin, lang) })}</small>
        <div className="rf-two">
          <label className="ad-field">{F.guests}
            <select value={f.guests} onChange={(e) => up({ guests: +e.target.value })}>{Array.from({ length: MAX_GUESTS }, (_, i) => <option key={i + 1} value={i + 1}>{guestLabel(i + 1)}</option>)}</select>
          </label>
          <label className="ad-field">{F.occasion}
            <select value={f.purpose} onChange={(e) => up({ purpose: e.target.value })}>{Object.keys(PURPOSES).map((k) => <option key={k} value={k}>{R.occ[k]}</option>)}</select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rf-card">
        <legend>{F.table}</legend>
        {!avail ? <div className="rf-tables">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="sk" style={{ height: 58, borderRadius: 14 }} aria-hidden="true" />)}</div> : (
          <>
            <div className="rf-tables" role="radiogroup" aria-label={F.tablePick}>
              <button type="button" role="radio" aria-checked={f.tableId === 'auto'} className={`rf-t auto${f.tableId === 'auto' ? ' on' : ''}`} onClick={() => up({ tableId: 'auto' })}>
                <b>{F.auto}</b><small>{free.length ? fill(F.freeN, { n: n(free.length) }) : F.noneFree}</small>
              </button>
              {avail.map((x) => {
                const ok = fits(x), small = x.seats < f.guests;
                return (
                  <button key={x.id} type="button" role="radio" aria-checked={f.tableId === x.id} disabled={!ok} className={`rf-t${f.tableId === x.id ? ' on' : ''}${ok ? '' : ' off'}`} onClick={() => up({ tableId: x.id })}
                    title={ok ? '' : small ? F.tooSmall : F.busy}>
                    <b>{x.id}</b><small>{fill(F.seatsN, { n: n(x.seats) })} · {R.zones[x.zone] || x.zone}</small><em>{ok ? F.free : small ? R.small : R.booked}</em>
                  </button>
                );
              })}
            </div>
            {free.length === 0 && <p className="ad-err" role="alert">{F.errors.no_table} {F.noTable}</p>}
          </>
        )}
      </fieldset>

      <fieldset className="rf-card">
        <legend>{F.follow}</legend>
        <label className="ad-field">{F.note}<textarea rows={3} maxLength={300} value={f.note} onChange={(e) => up({ note: e.target.value })} /></label>
        {!edit && (
          <div className="ad-field">{F.status}
            <div className="rf-seg" role="radiogroup" aria-label={F.status}>
              {[['confirmed', t.status.confirmed], ['pending', t.status.pending]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>)}
            </div>
          </div>
        )}
        <label className="rf-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>{edit ? F.notifyEdit : F.notifyNew}</span></label>
      </fieldset>

      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="rf-bar">
        <button className="ad-btn primary" type="submit" disabled={!canSubmit} aria-busy={busy}>{busy ? F.submitting : edit ? F.submitEdit : F.submitNew}</button>
        <Link className="ad-btn" href={edit ? `/admin/calendar?d=${initial.date}` : '/admin/reservations'}>{F.cancel}</Link>
      </div>
    </form>
  );
}
