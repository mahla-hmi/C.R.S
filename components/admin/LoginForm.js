'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm({ hint }) {
  const router = useRouter();
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
      setErr(r.status === 429 ? 'تلاش‌های ناموفق بیش از حد بود؛ لطفاً چند دقیقه بعد دوباره تلاش کنید.' : r.status === 503 ? 'اتصال به پایگاه‌داده برقرار نیست؛ ورود کارمندان فعلاً ممکن نیست.' : 'نام کاربری یا رمز عبور نادرست است.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); }
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="ad-form">
      <label className="ad-field">نام کاربری<input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoFocus dir="ltr" /></label>
      <label className="ad-field">رمز عبور
        <span className="ad-pw"><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}>{show ? 'پنهان' : 'نمایش'}</button></span>
      </label>
      {err && <p className="ad-err" role="alert">{err}</p>}
      <button className="ad-btn primary full" type="submit" disabled={busy || !user || !password}>{busy ? 'در حال ورود…' : 'ورود'}</button>
      {hint && <p className="ad-hint">حالت آزمایشی: نام کاربری <b dir="ltr">{hint.user}</b> و رمز <b dir="ltr">{hint.password}</b></p>}
    </form>
  );
}
