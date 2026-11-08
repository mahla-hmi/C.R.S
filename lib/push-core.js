// Pure helpers for owner notifications (unit-tested): message text, who gets it, subscription validation.
import { createHash } from 'node:crypto';
import { fmt } from './jalali';
import { fmtTime, fd } from './booking';
import { can } from './admin/permissions';
import { adminName } from './admin/auth';
export { generateVapidKeys } from './vapid';

export const subId = (endpoint) => createHash('sha256').update(String(endpoint)).digest('hex');

const summary = (r) => `${r.name} · ${fmt(r.date, 'fa', { weekday: 'long', day: 'numeric', month: 'long' })} · ساعت ${fmtTime(r.startMin, 'fa')} · ${fd(r.guests)} نفر · میز ${r.tableId}`;
export const newReservationPayload = (r) => ({ title: 'درخواست رزرو جدید', body: summary(r), tag: `res-${r.code}`, url: '/admin/reservations?view=pending' });
export const ownerSmsText = (r) => `کافه: درخواست رزرو جدید (در انتظار تأیید)\n${summary(r)}\nکد: ${r.code}`;

// Devices that should hear about a new reservation: the main owner, plus every ACTIVE member who may view reservations right now.
// (Permissions are checked at send time, so a member who was disabled or lost access stops receiving them at once.)
export function filterRecipients(subs, members) {
  const byName = new Map((members || []).map((m) => [m.username, m]));
  return (subs || []).filter((s) => {
    if (s.kind === 'p') return s.user === adminName();
    const m = byName.get(s.user);
    return !!m && can({ role: m.role, perms: m.perms || [] }, 'reservations.view');
  });
}

// what the browser's pushManager.subscribe() gives us (subscription.toJSON())
export function validateSubscription(s) {
  const endpoint = s?.endpoint, p256dh = s?.keys?.p256dh, auth = s?.keys?.auth;
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 2000) return { error: 'bad_subscription' };
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return { error: 'bad_subscription' };
  return { value: { endpoint, keys: { p256dh, auth } } };
}
