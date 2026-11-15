'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './LangProvider';

export default function LoginForm({ hint }) {
  const router = useRouter();
  const { t } = useAdmin();
  const L = t.login;
  const [user, setUser] = useState(hint?.user || '');
  const [password, setPassword] = useState(hint?.password || '');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, password }) });
      if (r.ok) { router.replace('/admin'); router.refresh(); return; }
      setErr(r.status === 429 ? L.rate : r.status === 503 ? L.db : L.bad);
    } catch { setErr(L.net); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="ad-form">
      <label className="ad-field">{L.user}<input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus dir="ltr" /></label>
      <label className="ad-field">{L.pass}
        <span className="ad-pw"><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? L.hideAria : L.showAria}>{show ? L.hide : L.show}</button></span>
      </label>
      {err && <p className="ad-err" role="alert">{err}</p>}
      <button className="ad-btn primary full" type="submit" disabled={busy || !user || !password} aria-busy={busy}>{busy ? L.busy : L.submit}</button>
      {hint && <p className="ad-hint">{L.dev[0]} <b dir="ltr">{hint.user}</b> {L.dev[1]} <b dir="ltr">{hint.password}</b></p>}
    </form>
  );
}
