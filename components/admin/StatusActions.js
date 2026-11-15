'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './LangProvider';

// [target status, look, needs "are you sure?"]
const ACTIONS = {
  pending: [['confirmed', 'ok', false], ['rejected', 'bad', true]],
  confirmed: [['completed', 'ok', false], ['no_show', 'mut', true], ['cancelled', 'bad', true]],
};
export default function StatusActions({ code, status }) {
  const router = useRouter();
  const { t, fill } = useAdmin();
  const A = t.act;
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
      else { const j = await r.json().catch(() => ({})); setErr(j.error === 'bad_transition' ? A.changed : A.failed); router.refresh(); }
    } catch { setErr(A.net); }
    setBusy(''); setAsk('');
  };
  const pending = acts.find((a) => a[0] === ask);
  return (
    <div className="ad-actions">
      {pending ? (
        <><span className="ad-sure">{fill(A.ask, { a: A.askWhat[ask] })}</span>
          <button className="ad-btn bad solid" disabled={!!busy} aria-busy={!!busy} onClick={() => run(ask)}>{busy ? t.busyDots : t.yes}</button>
          <button className="ad-btn" disabled={!!busy} onClick={() => setAsk('')}>{t.cancel}</button></>
      ) : acts.map(([to, look, sure]) => (
        <button key={to} title={to === 'no_show' ? A.noShowHint : undefined} className={`ad-btn ${look}`} disabled={!!busy} aria-busy={busy === to} onClick={() => (sure ? setAsk(to) : run(to))}>{busy === to ? t.busyDots : A[to]}</button>
      ))}
      {err && <p className="ad-err">{err}</p>}
    </div>
  );
}
