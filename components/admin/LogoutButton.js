'use client';
const Icon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10M14 8l4 4-4 4M18 12H9" /></svg>;
export default function LogoutButton({ label = 'خروج' }) {
  const out = async () => {
    // signing out on purpose also stops notifications on THIS device (a shared phone should not keep showing bookings)
    try {
      const reg = await navigator.serviceWorker?.getRegistration('/admin');
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) { await fetch('/api/admin/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    } catch { /* best effort */ }
    fetch('/api/admin/logout', { method: 'POST' }).finally(() => { window.location.href = '/admin/login'; });
  };
  return <button type="button" className="ad-out" onClick={out} aria-label={label} title={label}><Icon /><span>{label}</span></button>;
}
