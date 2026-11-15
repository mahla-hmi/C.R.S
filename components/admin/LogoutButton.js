'use client';
import { useAdmin } from './LangProvider';
const Icon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M14 8l4 4-4 4M18 12H9" /></svg>;
// only the panel's own notification registration (scope /admin); the guest one lives at scope "/" in the same browser
const panelReg = async () => (await navigator.serviceWorker.getRegistrations()).find((r) => new URL(r.scope).pathname === '/admin') || null;
export default function LogoutButton({ label }) {
  const { t } = useAdmin();
  const text = label || t.logout;
  const out = async () => {
    // signing out on purpose also stops notifications on THIS device (a shared phone should not keep showing bookings)
    try {
      const reg = navigator.serviceWorker && await panelReg();
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) { await fetch('/api/admin/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    } catch { /* best effort */ }
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => { window.location.href = '/admin/login'; });
  };
  return <button type="button" className="ad-out" onClick={out} aria-label={text} title={text}><Icon /><span>{text}</span></button>;
}
