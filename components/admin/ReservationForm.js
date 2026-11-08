'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OPEN, CLOSE, STEP, PURPOSES, MAX_GUESTS, cafeNow, isFree, stayFor, fmtTime, fmtDur, fd } from '@/lib/booking';
import { toJalali, fromJalali, monthLength, MONTHS } from '@/lib/jalali-cal';
import { fmt } from '@/lib/jalali';
import { rd } from '@/lib/reserve-dict';

const R = rd.fa;
const ERR = {
  taken: 'این میز در بازهٔ انتخاب‌شده رزرو دارد. لطفاً میز یا ساعت دیگری را برگزینید.',
  no_table: 'برای این زمان و تعداد نفرات میز آزادی وجود ندارد.',
  bad_table: 'میز انتخاب‌شده برای این تعداد نفرات مناسب نیست.',
  bad_contact: 'نام یا شمارهٔ تماس معتبر نیست.', bad_email: 'نشانی ایمیل معتبر نیست.',
  bad_date: 'تاریخ انتخاب‌شده معتبر نیست.', bad_time: 'ساعت انتخاب‌شده معتبر نیست.',
  too_soon: 'این ساعت سپری شده است؛ لطفاً ساعت دیگری را برگزینید.', bad_duration: 'مدت نشستن معتبر نیست.', bad_purpose: 'مناسبت انتخاب‌شده معتبر نیست.',
  bad_transition: 'وضعیت این رزرو تغییر کرده است؛ لطفاً صفحه را به‌روزرسانی کنید.', not_found: 'این رزرو یافت نشد.',
  forbidden: 'شما اجازهٔ ثبت یا ویرایش رزرو را ندارید.', db: 'اتصال به پایگاه‌داده برقرار نشد؛ لطفاً دوباره تلاش کنید.',
};
const SLOTS = Array.from({ length: (CLOSE - OPEN) / STEP }, (_, i) => OPEN + i * STEP);
const YEARS_AHEAD = 1;

// Shamsi date picker: year / month / day. Value and onChange use ISO (Gregorian) strings, like everything else.
function JalaliDate({ value, onChange, today }) {
  const t = toJalali(today), j = toJalali(value);
  const years = [...new Set([t.jy, ...Array.from({ length: YEARS_AHEAD }, (_, i) => t.jy + 1 + i), j.jy])].sort();
  const days = monthLength(j.jy, j.jm);
  const set = (jy, jm, jd) => { const iso = fromJalali(jy, jm, Math.min(jd, monthLength(jy, jm))); onChange(iso); };
  return (
    <div className="rf-date">
      <select aria-label="روز" value={j.jd} onChange={(e) => set(j.jy, j.jm, +e.target.value)}>{Array.from({ length: days }, (_, i) => <option key={i + 1} value={i + 1}>{fd(i + 1)}</option>)}</select>
      <select aria-label="ماه" value={j.jm} onChange={(e) => set(j.jy, +e.target.value, j.jd)}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
      <select aria-label="سال" value={j.jy} onChange={(e) => set(+e.target.value, j.jm, j.jd)}>{years.map((y) => <option key={y} value={y}>{fd(y)}</option>)}</select>
    </div>
  );
}

// mode "create": a new booking taken by phone / at the door. mode "edit": change an existing live booking.
export default function ReservationForm({ mode = 'create', initial, code = '', today }) {
  const router = useRouter();
  const edit = mode === 'edit';
  const [f, setF] = useState(initial);
  const [durTouched, setDurTouched] = useState(edit);
  const [avail, setAvail] = useState(null);
  const [status, setStatus] = useState('confirmed');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const up = (patch) => { setErr(''); setF((p) => ({ ...p, ...patch })); };

  // tables with their occupied ranges for the chosen day (the booking being edited does not block itself)
  useEffect(() => {
    let off = false;
    setAvail(null);
    fetch(`/api/admin/availability?date=${f.date}${edit ? `&exclude=${code}` : ''}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (off) return; if (r.ok) setAvail(j.tables); else { if (r.status === 401) window.location.href = '/admin/login'; setErr(ERR[j.error] || ERR.db); } })
      .catch(() => { if (!off) setErr(ERR.db); });
    return () => { off = true; };
  }, [f.date, code, edit]);

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
  const rel = f.date === today ? 'امروز' : '';
  const canSubmit = !busy && f.name.trim().length >= 2 && f.phone.trim().length >= 7 && avail && (f.tableId !== 'auto' || (free && free.length > 0));

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = { ...f, notify, ...(edit ? {} : { status }) };
      const r = await fetch(edit ? `/api/admin/reservations/${encodeURIComponent(code)}` : '/api/admin/reservations', { method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 401) { window.location.href = '/admin/login'; return; }
      const j = await r.json().catch(() => ({}));
      if (r.ok) { router.push(`/admin/calendar?d=${f.date}`); router.refresh(); return; }
      setErr(ERR[j.error] || 'ثبت انجام نشد؛ لطفاً دوباره تلاش کنید.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); }
    setBusy(false);
  };

  return (
    <form className="rf" onSubmit={submit}>
      <fieldset className="rf-card">
        <legend>مشخصات میهمان</legend>
        <label className="ad-field">نام و نام خانوادگی<input value={f.name} onChange={(e) => up({ name: e.target.value })} autoComplete="off" maxLength={60} required /></label>
        <label className="ad-field">شمارهٔ تماس<input type="tel" inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => up({ phone: e.target.value })} autoComplete="off" placeholder="09121234567" required /></label>
        <label className="ad-field">ایمیل (اختیاری)<input type="email" dir="ltr" value={f.email} onChange={(e) => up({ email: e.target.value })} autoComplete="off" /></label>
      </fieldset>

      <fieldset className="rf-card">
        <legend>زمان و تعداد نفرات</legend>
        <div className="ad-field">تاریخ
          <JalaliDate value={f.date} today={today} onChange={(date) => up({ date })} />
          <small className="ad-mut">{fmt(f.date, 'fa', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{rel && ` · ${rel}`}</small>
        </div>
        <div className="rf-two">
          <label className="ad-field">ساعت ورود
            <select value={f.startMin} onChange={(e) => up({ startMin: +e.target.value })}>
              {SLOTS.map((s) => <option key={s} value={s} disabled={!slotOk(s)}>{fmtTime(s, 'fa')}</option>)}
            </select>
          </label>
          <label className="ad-field">مدت نشستن
            <select value={f.durationMin} onChange={(e) => { setDurTouched(true); up({ durationMin: +e.target.value }); }}>
              {durations.map((d) => <option key={d} value={d}>{fmtDur(d, 'fa')}</option>)}
            </select>
          </label>
        </div>
        <small className="ad-mut">خروج حدود ساعت {fmtTime(f.startMin + f.durationMin, 'fa')}</small>
        <div className="rf-two">
          <label className="ad-field">تعداد نفرات
            <select value={f.guests} onChange={(e) => up({ guests: +e.target.value })}>{Array.from({ length: MAX_GUESTS }, (_, i) => <option key={i + 1} value={i + 1}>{fd(i + 1)} نفر</option>)}</select>
          </label>
          <label className="ad-field">مناسبت
            <select value={f.purpose} onChange={(e) => up({ purpose: e.target.value })}>{Object.keys(PURPOSES).map((k) => <option key={k} value={k}>{R.occ[k]}</option>)}</select>
          </label>
        </div>
      </fieldset>

      <fieldset className="rf-card">
        <legend>میز</legend>
        {!avail ? <div className="rf-tables">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="sk" style={{ height: 58, borderRadius: 14 }} aria-hidden="true" />)}</div> : (
          <>
            <div className="rf-tables" role="radiogroup" aria-label="انتخاب میز">
              <button type="button" role="radio" aria-checked={f.tableId === 'auto'} className={`rf-t auto${f.tableId === 'auto' ? ' on' : ''}`} onClick={() => up({ tableId: 'auto' })}>
                <b>خودکار</b><small>{free.length ? `${fd(free.length)} میز آزاد` : 'میز آزاد نیست'}</small>
              </button>
              {avail.map((x) => {
                const ok = fits(x), small = x.seats < f.guests;
                return (
                  <button key={x.id} type="button" role="radio" aria-checked={f.tableId === x.id} disabled={!ok} className={`rf-t${f.tableId === x.id ? ' on' : ''}${ok ? '' : ' off'}`} onClick={() => up({ tableId: x.id })}
                    title={ok ? '' : small ? 'ظرفیت ناکافی' : 'در این بازه رزرو دارد'}>
                    <b>{x.id}</b><small>{fd(x.seats)} نفره · {R.zones[x.zone] || x.zone}</small><em>{ok ? 'آزاد' : small ? R.small : R.booked}</em>
                  </button>
                );
              })}
            </div>
            {free.length === 0 && <p className="ad-err" role="alert">{ERR.no_table} ساعت یا روز دیگری را برگزینید.</p>}
          </>
        )}
      </fieldset>

      <fieldset className="rf-card">
        <legend>توضیحات و پیگیری</legend>
        <label className="ad-field">یادداشت (اختیاری)<textarea rows={3} maxLength={300} value={f.note} onChange={(e) => up({ note: e.target.value })} /></label>
        {!edit && (
          <div className="ad-field">وضعیت رزرو
            <div className="rf-seg" role="radiogroup" aria-label="وضعیت رزرو">
              {[['confirmed', 'تأیید شده'], ['pending', 'در انتظار تأیید']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{l}</button>)}
            </div>
          </div>
        )}
        <label className="rf-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <span>{edit ? 'در صورت تغییر زمان یا میز، پیامک به میهمان ارسال شود' : 'پیامک ثبت رزرو به میهمان ارسال شود'}</span></label>
      </fieldset>

      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="rf-bar">
        <button className="ad-btn primary" type="submit" disabled={!canSubmit}>{busy ? 'در حال ثبت…' : edit ? 'ذخیرهٔ تغییرات' : 'ثبت رزرو'}</button>
        <Link className="ad-btn" href={edit ? `/admin/calendar?d=${initial.date}` : '/admin/reservations'}>انصراف</Link>
      </div>
    </form>
  );
}
