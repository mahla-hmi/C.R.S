'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sk } from '@/components/Skeleton';

const json = { 'Content-Type': 'application/json' };
const keyToBytes = (s) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
// only the panel's own registration (scope /admin): the guest notifications use another one at scope "/" in the same browser
const getReg = async () => (await navigator.serviceWorker.getRegistrations()).find((r) => new URL(r.scope).pathname === '/admin') || null;

// state: loading | on | off | denied | ios (must be installed first) | insecure (needs https) | unsupported
function usePush() {
  const [state, setState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const check = useCallback(async () => {
    try {
      if (!window.isSecureContext) return setState('insecure');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState(isIOS() && !installed() ? 'ios' : 'unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await getReg();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
    } catch { setState('unsupported'); }
  }, []);
  useEffect(() => {
    check();
    window.addEventListener('push-changed', check); // the banner and the dashboard card stay in sync
    return () => window.removeEventListener('push-changed', check);
  }, [check]);

  const run = async (fn) => { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(e?.userMessage || 'عملیات انجام نشد؛ لطفاً دوباره تلاش کنید.'); } setBusy(false); window.dispatchEvent(new Event('push-changed')); };
  const fail = (m) => Object.assign(new Error(m), { userMessage: m });

  const enable = () => run(async () => {
    if ((await Notification.requestPermission()) !== 'granted') return; // the state check shows "blocked" or "off"
    const reg = await navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' });
    await navigator.serviceWorker.ready;
    const k = await fetch('/api/admin/push');
    if (!k.ok) throw fail('دریافت کلید اعلان از سرور ممکن نشد (اتصال به پایگاه‌داده را بررسی کنید).');
    const { publicKey } = await k.json();
    const old = await reg.pushManager.getSubscription();
    if (old) await old.unsubscribe(); // a leftover subscription made with another key would be refused
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
    const r = await fetch('/api/admin/push', { method: 'POST', headers: json, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (!r.ok) { await sub.unsubscribe(); throw fail('ذخیرهٔ این دستگاه روی سرور انجام نشد.'); }
    setMsg('اعلان‌ها فعال شد ✓');
  });
  const disable = () => run(async () => {
    const reg = await getReg(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await fetch('/api/admin/push', { method: 'DELETE', headers: json, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
    setMsg('اعلان‌ها روی این دستگاه غیرفعال شد.');
  });
  const test = () => run(async () => {
    const r = await fetch('/api/admin/push/test', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.sent) throw fail('اعلان آزمایشی ارسال نشد. لطفاً اعلان را غیرفعال و دوباره فعال کنید.');
    setMsg('اعلان آزمایشی ارسال شد؛ طی چند ثانیه می‌رسد.');
  });
  return { state, busy, msg, enable, disable, test };
}

const Bell = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15L6 16.5ZM10 20.5a2 2 0 0 0 4 0" /></svg>;
const HELP = {
  denied: 'اجازهٔ اعلان در این مرورگر مسدود شده است. بر روی نماد قفل در کنار نشانی صفحه کلیک کنید، گزینهٔ «اعلان‌ها» را روی «اجازه» قرار دهید و صفحه را دوباره باز کنید.',
  ios: 'در آیفون و آیپد ابتدا پنل را به صفحهٔ اصلی اضافه کنید: دکمهٔ اشتراک‌گذاری ← «Add to Home Screen». سپس از همان نماد باز کنید و اعلان را فعال کنید (iOS 16.4 به بالا).',
  insecure: 'اعلان وب تنها در نشانی امن (HTTPS) یا localhost کار می‌کند. روی سرور اصلی با HTTPS مشکلی وجود ندارد.',
  unsupported: 'این مرورگر اعلان وب را پشتیبانی نمی‌کند. از Chrome، Edge، Firefox یا Safari جدید استفاده کنید.',
};

// banner = a one-line nudge (only while notifications are off); card = full status and controls (dashboard)
export default function PushSetup({ variant = 'card' }) {
  const path = usePathname();
  const p = usePush();
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem('push-dismissed')) setHidden(true); } catch {} }, []);

  if (variant === 'banner') {
    if (path === '/admin' || p.state !== 'off' || hidden) return null; // the dashboard shows the full card instead
    return (
      <div className="ad-push banner fx" role="region" aria-label="اعلان رزرو جدید">
        <Bell /><p>اعلان را فعال کنید تا حتی در زمان بسته بودن پنل، با ثبت هر درخواست رزرو جدید بی‌درنگ آگاه شوید.</p>
        <button className="ad-btn primary" onClick={p.enable} disabled={p.busy}>{p.busy ? '…' : 'فعال‌سازی'}</button>
        <button className="ad-btn" onClick={() => { try { sessionStorage.setItem('push-dismissed', '1'); } catch {} setHidden(true); }}>بعداً</button>
      </div>
    );
  }
  if (p.state === 'loading') return <Sk h={96} r={20} style={{ marginBottom: 18 }} />;
  return (
    <section className={`ad-push card fx ${p.state}`} aria-label="اعلان رزرو جدید">
      <div className="ad-push-ic"><Bell /></div>
      <div className="ad-push-tx">
        <h2>اعلان درخواست‌های رزرو</h2>
        {p.state === 'on' && <p>روی این دستگاه فعال است ✓ با ثبت هر درخواست جدید، حتی در صورت بسته بودن پنل، اعلان دریافت می‌کنید.</p>}
        {p.state === 'off' && <p>برای آگاهی از درخواست‌های جدید، بدون نیاز به باز بودن پنل، اعلان را روی این دستگاه فعال کنید.</p>}
        {HELP[p.state] && <p>{HELP[p.state]}</p>}
        {p.msg && <p className="ad-push-msg" role="status">{p.msg}</p>}
      </div>
      <div className="ad-actions">
        {p.state === 'off' && <button className="ad-btn primary" onClick={p.enable} disabled={p.busy}>{p.busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی اعلان'}</button>}
        {p.state === 'on' && <><button className="ad-btn" onClick={p.test} disabled={p.busy}>اعلان آزمایشی</button><button className="ad-btn mut" onClick={p.disable} disabled={p.busy}>غیرفعال‌سازی</button></>}
      </div>
    </section>
  );
}
