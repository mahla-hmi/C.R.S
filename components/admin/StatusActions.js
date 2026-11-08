'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// [target status, label, look, needs "are you sure?"]
const ACTIONS = {
  pending: [['confirmed', 'تأیید', 'ok', false], ['rejected', 'رد', 'bad', true]],
  confirmed: [['completed', 'انجام شد', 'ok', false], ['no_show', 'کنسلی', 'mut', true, 'مهمان در زمان رزرو حاضر نشد'], ['cancelled', 'لغو', 'bad', true]],
};
export default function StatusActions({ code, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [ask, setAsk] = useState('');
  const [err, setErr] = useState('');
  const acts = ACTIONS[status];
  if (!acts) return null;
  const run = async (to) => {
    setBusy(to); setErr('');
    try {
      const r = await fetch(`/api/admin/reservations/${encodeURIComponent(code)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: to }) });
      if (r.status === 401) { window.location.href = '/admin/login'; return; }
      if (r.ok) router.refresh();
      else { const j = await r.json().catch(() => ({})); setErr(j.error === 'bad_transition' ? 'وضعیت این رزرو تغییر کرده است؛ لطفاً صفحه را به‌روزرسانی کنید.' : 'ثبت تغییر انجام نشد.'); router.refresh(); }
    } catch { setErr('ارتباط با سرور برقرار نشد.'); }
    setBusy(''); setAsk('');
  };
  const pending = acts.find((a) => a[0] === ask);
  return (
    <div className="ad-actions">
      {pending ? (
        <><span className="ad-sure">آیا از {pending[1]} این رزرو اطمینان دارید؟</span>
          <button className="ad-btn bad solid" disabled={!!busy} onClick={() => run(ask)}>{busy ? '…' : 'بله'}</button>
          <button className="ad-btn" disabled={!!busy} onClick={() => setAsk('')}>انصراف</button></>
      ) : acts.map(([to, label, look, sure, hint]) => (
        <button key={to} title={hint} className={`ad-btn ${look}`} disabled={!!busy} onClick={() => (sure ? setAsk(to) : run(to))}>{busy === to ? '…' : label}</button>
      ))}
      {err && <p className="ad-err">{err}</p>}
    </div>
  );
}
