// Booking rules shared by the UI and the API. Pure functions, no imports.
// Times are "minutes since midnight" in the cafe's own time zone.

export const TZ = 'Asia/Tehran';
export const OPEN = 10 * 60;      // 10:00  (per-day hours will come from the admin panel later)
export const CLOSE = 22 * 60;     // 22:00  (a stay must END by this time)
export const STEP = 30;           // start times and stay lengths are multiples of this
export const CELL = 15;           // DB lock granularity (see lib/mongo.js)
export const BUFFER_MIN = 15;     // table turnover kept free after every booking
export const LEAD_MIN = 30;       // earliest bookable start = now + this
export const BOOKING_DAYS = 21;   // how many days ahead guests can book
export const MAX_GUESTS = 6;

// How long we keep a table for a guest. The guest is NOT asked: we estimate it from the occasion and the group size.
// A normal visit gets about an hour; celebrations get more. Tune the numbers here.
export const PURPOSES = {
  regular:     { icon: '🪑', stay: 60,  special: false },
  birthday:    { icon: '🎂', stay: 150, special: true },
  anniversary: { icon: '💐', stay: 90,  special: true },
  other:       { icon: '✨', stay: 90,  special: true },
};
export const LARGE_GROUP = 5;        // groups of 5+ ...
export const LARGE_GROUP_EXTRA = 30; // ... get this many extra minutes
export const ZONES = ['any', 'indoor', 'window', 'terrace']; // seating-area preference ("any" = let the cafe choose)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const stayMinutes = (purpose, guests) => PURPOSES[purpose].stay + (guests >= LARGE_GROUP ? LARGE_GROUP_EXTRA : 0);
// the stay never runs past closing time (arriving at 21:30 gets a 30-minute stay)
export const stayFor = (purpose, guests, start) => Math.min(stayMinutes(purpose, guests), CLOSE - start);


const pad = (n) => String(n).padStart(2, '0');
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const fd = (x) => String(x).replace(/\d/g, (d) => FA_DIGITS[d]);
// Persian/Arabic-Indic digits -> ASCII (phone numbers typed on a Persian keyboard)
export const normDigits = (s) => String(s ?? '')
  .replace(/[۰-۹]/g, (c) => c.charCodeAt(0) - 0x06f0)
  .replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 0x0660);

// "Now" in the cafe's time zone, independent of the guest's device zone.
export function cafeNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
export const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
};
export const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
  && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
export const bookingDays = (now = cafeNow()) => Array.from({ length: BOOKING_DAYS }, (_, i) => addDays(now.date, i));

export const earliestStart = (date, now = cafeNow()) =>
  date === now.date ? Math.max(OPEN, Math.ceil((now.min + LEAD_MIN) / STEP) * STEP) : OPEN;

// A booking blocks its table from `start` until `start + dur + BUFFER_MIN`.
export const occupied = (start, dur) => [start, start + dur + BUFFER_MIN];
// busy = [[from, to], ...] already-occupied ranges of ONE table (buffer included)
export const isFree = (busy, start, dur) => {
  const [a, b] = occupied(start, dur);
  return !busy.some(([c, d]) => a < d && c < b);
};
// Best free table for a guest: preferred area first, then the smallest table that fits. Returns an id or null.
export function autoPick(tables, { guests, zone, start, dur }) {
  const free = tables.filter((t) => t.seats >= guests && isFree(t.busy, start, dur));
  const score = (t) => (zone !== 'any' && t.zone !== zone ? 1000 : 0) + (t.seats - guests);
  return free.length ? [...free].sort((a, b) => score(a) - score(b))[0].id : null; // sort is stable: ties keep floor-plan order
}
// Lock cells stored on the reservation; a unique index on them forbids overlaps.
export const cellsFor = (start, dur) => {
  const [a, b] = occupied(start, dur); const out = [];
  for (let c = Math.floor(a / CELL); c < Math.ceil(b / CELL); c++) out.push(c);
  return out;
};

export const fmtTime = (min, locale) => {
  const s = `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  return locale === 'fa' ? fd(s) : s;
};
export function fmtDur(min, locale) {
  const h = Math.floor(min / 60), m = min % 60;
  if (locale === 'fa') {
    if (!h) return fd(m) + ' دقیقه';
    if (!m) return fd(h) + ' ساعت';
    if (m === 30) return fd(h) + ' ساعت و نیم';
    return fd(h) + ' ساعت و ' + fd(m) + ' دقیقه';
  }
  if (!h) return m + ' min';
  if (!m) return h + ' h';
  if (m === 30) return h + '.5 h';
  return h + ' h ' + m + ' min';
}

// Server-side validation. Returns { error } or { value }. The stay length is decided here, never taken from the client.
export function validate(b, tables, now = cafeNow()) {
  const purpose = String(b.purpose);
  const P = Object.hasOwn(PURPOSES, purpose) ? PURPOSES[purpose] : null;
  if (!P) return { error: 'bad_purpose' };
  const date = String(b.date || '');
  if (!isValidDate(date) || date < now.date || date > addDays(now.date, BOOKING_DAYS - 1)) return { error: 'bad_date' };
  const startMin = Number(b.startMin);
  if (!Number.isInteger(startMin) || startMin % STEP || startMin < OPEN || startMin + STEP > CLOSE) return { error: 'bad_time' };
  if (date === now.date && startMin < now.min + LEAD_MIN) return { error: 'too_soon' };
  const zone = b.zone === undefined || b.zone === '' ? 'any' : String(b.zone);
  if (!ZONES.includes(zone)) return { error: 'bad_zone' };
  const table = tables.find((t) => t.id === b.tableId);
  const guests = Number(b.guests);
  if (!table || !Number.isInteger(guests) || guests < 1 || guests > Math.min(table.seats, MAX_GUESTS)) return { error: 'bad_table' };
  const name = String(b.name || '').trim().slice(0, 60);
  const phone = normDigits(b.phone).trim();
  if (name.length < 2 || !/^[\d+\-\s()]{7,18}$/.test(phone)) return { error: 'bad_contact' };
  const email = String(b.email || '').trim().toLowerCase();
  if (email && (email.length > 100 || !EMAIL_RE.test(email))) return { error: 'bad_email' };
  const durationMin = stayFor(purpose, guests, startMin);
  return { value: {
    date, startMin, endMin: startMin + durationMin, durationMin, purpose, special: P.special, guests, tableId: table.id, zonePref: zone,
    name, email, phone, note: String(b.note || '').trim().slice(0, 300), locale: b.locale === 'en' ? 'en' : 'fa',
  } };
}
