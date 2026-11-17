// Reads used by the manual-reservation screens (server only).
import { db } from '../mongo';
const HIDE = { _id: 0, cells: 0, nameKey: 0, phoneKey: 0 };

export async function getReservation(code) {
  return (await db()).collection('reservations').findOne({ code: String(code || '').toUpperCase() }, { projection: HIDE });
}
// today's (or any day's) active bookings; `exclude` leaves one reservation out so an edit does not collide with itself
export async function activeRows(col, date, exclude = null) {
  return col.find({ date, active: true, ...(exclude ? { code: { $ne: exclude } } : {}) }, { projection: { tableId: 1, startMin: 1, endMin: 1 } }).toArray();
}
