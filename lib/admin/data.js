// Admin reads. buildFilter/sortFor are pure (unit-tested); the rest talks to MongoDB.
import { db } from '../mongo';
import { cafeNow, normDigits } from '../booking';
import { nameKeyOf } from '../identity';
import { LIVE } from './rules';

export const VIEWS = ['all', 'pending', 'today', 'upcoming', 'confirmed', 'past', 'cancelled'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildFilter(view, q, today) {
  const all = [];
  if (view === 'pending') all.push({ status: 'pending' });
  else if (view === 'confirmed') all.push({ status: 'confirmed' });
  else if (view === 'today') all.push({ date: today });
  else if (view === 'upcoming') all.push({ date: { $gte: today }, status: { $in: LIVE } });
  else if (view === 'past') all.push({ $or: [{ date: { $lt: today } }, { status: { $in: ['completed', 'no_show'] } }] });
  else if (view === 'cancelled') all.push({ status: { $in: ['cancelled', 'rejected'] } });
  const term = String(q || '').trim();
  if (term) { // code, phone digits or name
    const ors = [{ code: term.toUpperCase() }];
    const digits = normDigits(term).replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length >= 3) ors.push({ phoneKey: { $regex: esc(digits.slice(-10)) } });
    const nk = nameKeyOf(term);
    if (nk.length >= 2) ors.push({ nameKey: { $regex: esc(nk) } });
    all.push({ $or: ors });
  }
  return all.length ? { $and: all } : {};
}
// soonest first for "what is coming", newest first for history
export const sortFor = (view) => (['pending', 'today', 'upcoming', 'confirmed'].includes(view) ? { date: 1, startMin: 1 } : { date: -1, startMin: -1 });
const HIDE = { _id: 0, cells: 0, nameKey: 0, phoneKey: 0 };

export async function listReservations({ view = 'pending', q = '', page = 1, size = 20 }) {
  const col = (await db()).collection('reservations');
  const filter = buildFilter(view, q, cafeNow().date);
  const total = await col.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const items = await col.find(filter, { projection: HIDE }).sort(sortFor(view)).skip((p - 1) * size).limit(size).toArray();
  return { items, total, pages, page: p };
}
export async function viewCounts() {
  const col = (await db()).collection('reservations');
  const today = cafeNow().date;
  const entries = await Promise.all(VIEWS.map(async (v) => [v, await col.countDocuments(buildFilter(v, '', today))]));
  return Object.fromEntries(entries);
}
export async function dashboard() {
  const col = (await db()).collection('reservations');
  const today = cafeNow().date;
  const live = { status: { $in: LIVE } };
  const [pending, todayLive, upcoming, guests, needs, schedule] = await Promise.all([
    col.countDocuments({ status: 'pending' }),
    col.countDocuments({ date: today, ...live }),
    col.countDocuments({ date: { $gte: today }, ...live }),
    col.aggregate([{ $match: { date: today, ...live } }, { $group: { _id: null, g: { $sum: '$guests' } } }]).toArray(),
    col.find({ status: 'pending' }, { projection: HIDE }).sort({ date: 1, startMin: 1 }).limit(6).toArray(),
    col.find({ date: today, ...live }, { projection: HIDE }).sort({ startMin: 1 }).toArray(),
  ]);
  return { today, pending, todayLive, upcoming, guestsToday: guests[0]?.g || 0, needs, schedule };
}
export async function pendingCount() {
  return (await db()).collection('reservations').countDocuments({ status: 'pending' });
}
