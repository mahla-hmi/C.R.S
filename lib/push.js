// Web Push to the owner's phone/computer when a reservation request arrives. Never allowed to break a booking:
// callers run it inside after() and catch errors. VAPID keys: from .env.local if set, otherwise created once and kept in the database.
import { db } from './mongo';
import { sendSms } from './sms';
import { generateVapidKeys, newReservationPayload, ownerSmsText, filterRecipients, subId } from './push-core';
import { guestPayload, guestExpiry } from './guest-push-core';
import { createHash } from 'node:crypto';

export async function getVapid(d) {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const col = d.collection('settings');
  const found = await col.findOne({ _id: 'vapid' });
  if (found) return { publicKey: found.publicKey, privateKey: found.privateKey };
  const keys = generateVapidKeys();
  try { await col.insertOne({ _id: 'vapid', ...keys, createdAt: new Date() }); return keys; }
  catch (e) { if (e?.code === 11000) { const again = await col.findOne({ _id: 'vapid' }); return { publicKey: again.publicKey, privateKey: again.privateKey }; } throw e; } // two requests at once
}

// send one payload to many devices; dead subscriptions (404/410) are removed from `coll`
export async function deliver(d, subs, payload, { coll = 'push_subscriptions', ttl = 3600, urgency = 'high' } = {}) {
  if (!subs.length) return 0;
  const webpush = (await import('web-push')).default; // loaded lazily: a missing package can only disable notifications, never bookings
  const v = await getVapid(d);
  webpush.setVapidDetails(process.env.PUSH_CONTACT || 'mailto:owner@example.com', v.publicKey, v.privateKey);
  const body = JSON.stringify(payload);
  const col = d.collection(coll);
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: ttl, urgency }); sent++; }
    catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await col.deleteOne({ _id: s._id });
      else console.error('[push] send failed:', e?.statusCode, String(e?.body || e?.message || '').slice(0, 120));
    }
  }));
  return sent;
}

// called right after a reservation is stored
export async function notifyNewReservation(r) {
  const d = await db();
  const [subs, members] = await Promise.all([
    d.collection('push_subscriptions').find({}).toArray(),
    d.collection('admins').find({ active: true }, { projection: { username: 1, role: 1, perms: 1 } }).toArray(),
  ]);
  const jobs = [deliver(d, filterRecipients(subs, members), newReservationPayload(r))];
  if (process.env.OWNER_PHONE) jobs.push(sendSms(process.env.OWNER_PHONE, ownerSmsText(r))); // optional extra SMS to the owner
  for (const x of await Promise.allSettled(jobs)) if (x.status === 'rejected') console.error('[notify] failed:', x.reason?.message);
}

export async function saveSubscription(d, session, sub) {
  await d.collection('push_subscriptions').updateOne(
    { _id: subId(sub.endpoint) },
    { $set: { endpoint: sub.endpoint, keys: sub.keys, user: session.user, kind: session.primary ? 'p' : 'd', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}
export const removeSubscription = (d, session, endpoint) => d.collection('push_subscriptions').deleteOne({ _id: subId(endpoint), user: session.user });
export async function sendTest(d, session) {
  const subs = await d.collection('push_subscriptions').find({ user: session.user, kind: session.primary ? 'p' : 'd' }).toArray();
  return deliver(d, subs, { title: 'اعلان آزمایشی', body: 'اعلان درخواست‌های رزرو روی این دستگاه فعال است ✓', tag: 'test', url: '/admin' });
}

// ---- guests who booked on the website and allowed notifications on that device ----
// One row per (device, reservation code); rows expire by themselves (TTL index on expireAt).
const guestId = (endpoint, code) => createHash('sha256').update(`${endpoint}|${code}`).digest('hex');
export async function saveGuestSubscription(d, code, date, sub) {
  await d.collection('guest_push').updateOne(
    { _id: guestId(sub.endpoint, code) },
    { $set: { endpoint: sub.endpoint, keys: sub.keys, code, expireAt: guestExpiry(date), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}
// kind: created | confirmed | rejected | cancelled | changed. Never throws into a booking: callers run it inside after().
export async function notifyGuest(r, kind) {
  const d = await db();
  const subs = await d.collection('guest_push').find({ code: r.code }).toArray();
  if (!subs.length) return 0;
  if (kind === 'changed') await d.collection('guest_push').updateMany({ code: r.code }, { $set: { expireAt: guestExpiry(r.date) } }); // the day may have moved
  return deliver(d, subs, guestPayload(kind, r), { coll: 'guest_push', ttl: 86400, urgency: kind === 'created' ? 'high' : 'normal' });
}
export const publicVapidKey = async () => (await getVapid(await db())).publicKey;
