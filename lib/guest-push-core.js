// Pure helpers for notifications to the GUEST who booked on the website (no database, unit-tested).
// The owner's notifications live in push-core.js; these are separate on purpose (different people, different device list).
import { fmt } from './jalali';
import { fmtTime } from './booking';

// A guest's browser hands us a push endpoint and the server then POSTs to it. Because anyone can send us an endpoint,
// only the real push services are accepted (otherwise the server could be made to call arbitrary addresses).
const HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
export function isPushHost(endpoint) {
  let h;
  try { const u = new URL(endpoint); if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false; h = u.hostname.toLowerCase(); } catch { return false; }
  return HOSTS.some((x) => h === x || h.endsWith('.' + x));
}
// subscription.toJSON() from the browser -> { value } or { error }
export function validateGuestSubscription(s) {
  const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
  if (typeof endpoint !== 'string' || endpoint.length > 2000 || !isPushHost(endpoint)) return { error: 'bad_subscription' };
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return { error: 'bad_subscription' };
  return { value: { endpoint, keys: { p256dh, auth } } };
}
// stored devices are forgotten two days after the booking day (TTL index on expireAt)
export const guestExpiry = (date) => new Date(Date.parse(date + 'T00:00:00Z') + 3 * 86400000);

export const GUEST_KINDS = ['created', 'confirmed', 'rejected', 'cancelled', 'changed'];
const T = {
  fa: {
    created: ['رزرو شما ثبت شد', 'در انتظار تأیید کافه'], confirmed: ['رزرو شما تأیید شد', 'منتظر دیدارتان هستیم'],
    rejected: ['رزرو شما ممکن نشد', 'لطفاً زمان دیگری را برگزینید یا با کافه تماس بگیرید'], cancelled: ['رزرو شما لغو شد', ''], changed: ['رزرو شما تغییر کرد', 'جزئیات جدید را بررسی کنید'],
    table: 'میز', code: 'کد پیگیری', at: 'ساعت',
  },
  en: {
    created: ['Your booking is in', 'Waiting for the cafe to confirm'], confirmed: ['Your booking is confirmed', 'See you soon'],
    rejected: ['We could not take your booking', 'Please pick another time or call the cafe'], cancelled: ['Your booking was cancelled', ''], changed: ['Your booking was updated', 'Please check the new details'],
    table: 'Table', code: 'Code', at: '',
  },
};
// r: a reservation ({ date, startMin, endMin, tableId, code, locale })
export function guestPayload(kind, r) {
  const loc = r.locale === 'en' ? 'en' : 'fa', x = T[loc];
  const [title, lead] = x[kind] || x.changed;
  const when = fmt(r.date, loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const range = `${fmtTime(r.startMin, loc)}–${fmtTime(r.endMin, loc)}`;
  const details = `${when}${x.at ? ` · ${x.at} ` : ' · '}${range} · ${x.table} ${r.tableId}`;
  const body = [lead, kind === 'cancelled' || kind === 'rejected' ? `${when} · ${range}` : details, `${x.code}: ${r.code}`].filter(Boolean).join('\n');
  return { title, body, tag: `guest-${r.code}`, url: `/${loc}/my`, lang: loc };
}
