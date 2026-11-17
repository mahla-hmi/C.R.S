// Browser side of guest notifications (imported by the booking form). Everything here is allowed to fail:
// a booking never depends on notifications.
const urlToBytes = (s) => { const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
const sameKey = (sub, bytes) => { const k = sub.options?.applicationServerKey; if (!k) return false; const a = new Uint8Array(k); return a.length === bytes.length && a.every((v, i) => v === bytes[i]); };
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// 'ok' | 'denied' | 'insecure' (needs https) | 'unsupported'. iPhones only support it for a site added to the home screen: they report 'unsupported' otherwise.
export function pushSupport() {
  if (typeof window === 'undefined') return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return Notification.permission === 'denied' ? 'denied' : 'ok';
}

// Call from a tap (the browser only shows its permission question after a user action).
// Returns the subscription as plain JSON to send with the booking, or null (declined, unsupported, or any error).
export async function subscribeForBooking() {
  try {
    if (pushSupport() !== 'ok') return null;
    if ((Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()) !== 'granted') return null;
    return await within((async () => {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const r = await fetch('/api/push/key');
      if (!r.ok) return null;
      const bytes = urlToBytes((await r.json()).publicKey);
      let sub = await reg.pushManager.getSubscription();
      if (sub && !sameKey(sub, bytes)) { await sub.unsubscribe(); sub = null; } // made with another key (e.g. after a database reset): it would be refused
      sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
      return sub.toJSON();
    })(), 12000);
  } catch { return null; }
}
