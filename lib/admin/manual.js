// Reservations made or changed BY THE CAFE (owner panel). Pure functions, no database: validation and table choice.
// Guests keep using validate() in lib/booking.js; the cafe has looser rules (any stay length, no lead time, further ahead).
import { PURPOSES, STEP, OPEN, CLOSE, BUFFER_MIN, EMAIL_RE, normDigits, cafeNow, addDays, isValidDate, stayFor, autoPick } from '../booking';

export const OWNER_DAYS = 180; // how far ahead the cafe can book on behalf of a guest

// body: what the form sends. existing: the reservation being edited (null when creating).
// Returns { error } or { value }. tableId may come back as 'auto' - the caller picks one with pickTable().
export function validateOwner(b, tables, now = cafeNow(), existing = null) {
  const purpose = String(b.purpose || 'regular');
  const P = Object.hasOwn(PURPOSES, purpose) ? PURPOSES[purpose] : null;
  if (!P) return { error: 'bad_purpose' };
  const date = String(b.date || '');
  // a live booking of an earlier day can still be edited as long as its day is not changed
  if (!isValidDate(date) || (date < now.date && existing?.date !== date) || date > addDays(now.date, OWNER_DAYS)) return { error: 'bad_date' };
  const startMin = Number(b.startMin);
  if (!Number.isInteger(startMin) || startMin % STEP || startMin < OPEN || startMin + STEP > CLOSE) return { error: 'bad_time' };
  const unchanged = existing && existing.date === date && existing.startMin === startMin;
  if (!unchanged && date === now.date && startMin < Math.floor(now.min / STEP) * STEP) return { error: 'too_soon' };

  const guests = Number(b.guests);
  const wantsAuto = b.tableId === undefined || b.tableId === '' || b.tableId === 'auto';
  const table = wantsAuto ? null : tables.find((t) => t.id === b.tableId);
  if (!wantsAuto && !table) return { error: 'bad_table' };
  const biggest = Math.max(0, ...tables.map((t) => t.seats));
  if (!Number.isInteger(guests) || guests < 1 || guests > (table ? table.seats : biggest)) return { error: 'bad_table' };

  const durationMin = b.durationMin === undefined || b.durationMin === '' ? stayFor(purpose, guests, startMin) : Number(b.durationMin);
  if (!Number.isInteger(durationMin) || durationMin < STEP || durationMin % STEP || startMin + durationMin > CLOSE) return { error: 'bad_duration' };

  const name = String(b.name || '').trim().slice(0, 60);
  const phone = normDigits(b.phone).trim();
  if (name.length < 2 || !/^[\d+\-\s()]{7,18}$/.test(phone)) return { error: 'bad_contact' };
  const email = String(b.email || '').trim().toLowerCase();
  if (email && (email.length > 100 || !EMAIL_RE.test(email))) return { error: 'bad_email' };

  return { value: {
    date, startMin, endMin: startMin + durationMin, durationMin, purpose, special: P.special, guests,
    tableId: table ? table.id : 'auto', zonePref: existing?.zonePref || 'any',
    name, email, phone, note: String(b.note || '').trim().slice(0, 300), locale: existing?.locale === 'en' ? 'en' : 'fa',
  } };
}

// rows: the day's active reservations [{ tableId, startMin, endMin }] (the one being edited already left out)
export const busyOf = (rows) => {
  const busy = {};
  for (const r of rows) (busy[r.tableId] ||= []).push([r.startMin, r.endMin + BUFFER_MIN]);
  return busy;
};
// best free table for the chosen slot, or null
export function pickTable(tables, rows, v) {
  const busy = busyOf(rows);
  return autoPick(tables.map((t) => ({ ...t, busy: busy[t.id] || [] })), { guests: v.guests, zone: 'any', start: v.startMin, dur: v.durationMin });
}
// which fields of an existing reservation the form changed
export const FIELDS = ['date', 'startMin', 'durationMin', 'tableId', 'guests', 'purpose', 'name', 'phone', 'email', 'note'];
export const GUEST_VISIBLE = ['date', 'startMin', 'durationMin', 'tableId', 'guests']; // changes worth an SMS to the guest
export const changedFields = (existing, v) => FIELDS.filter((k) => (existing[k] ?? '') !== v[k]);
