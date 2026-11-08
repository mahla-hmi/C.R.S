// Calendar reads (server only). One aggregate for a whole month, one query for a single day.
import { db } from '../mongo';
import { getTables } from '../data';
import { DEAD } from './timeline';

const HIDE = { _id: 0, cells: 0, nameKey: 0, phoneKey: 0 };

// { 'YYYY-MM-DD': { n, pending, guests } } for [from, to]; cancelled and rejected bookings are not counted
export async function monthSummary(from, to) {
  const col = (await db()).collection('reservations');
  const rows = await col.aggregate([
    { $match: { date: { $gte: from, $lte: to }, status: { $nin: DEAD } } },
    { $group: { _id: { d: '$date', s: '$status' }, n: { $sum: 1 }, g: { $sum: '$guests' } } },
  ]).toArray();
  const days = {};
  for (const { _id, n, g } of rows) {
    const o = days[_id.d] || (days[_id.d] = { n: 0, pending: 0, guests: 0 });
    o.n += n; o.guests += g;
    if (_id.s === 'pending') o.pending += n;
  }
  return days;
}

// everything for one day: all its reservations (any status) and the floor plan
export async function dayView(date) {
  const col = (await db()).collection('reservations');
  const [items, tables] = await Promise.all([
    col.find({ date }, { projection: HIDE }).sort({ startMin: 1, createdAt: 1 }).toArray(),
    getTables(),
  ]);
  return { items, tables };
}
