'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './LangProvider';

// Switches the panel between Persian and English. The server stores the choice in a cookie
// (and tells this person's notification devices, so new-booking alerts arrive in the same language).
export default function LangSwitch({ className = '' }) {
  const { lang, t } = useAdmin();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await fetch('/api/admin/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: lang === 'fa' ? 'en' : 'fa' }) }); } catch { /* the cookie is the only thing that matters */ }
    router.refresh();
    setBusy(false);
  };
  return <button type="button" className={`ad-lang ${className}`} onClick={go} disabled={busy} aria-label={t.lang.aria} title={t.lang.aria}>{t.lang.btn}</button>;
}
