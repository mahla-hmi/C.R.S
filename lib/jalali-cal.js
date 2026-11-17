// Shamsi (Jalali) month math on top of the built-in Intl calendar, so it always agrees with the dates shown elsewhere in the panel.
// Internally every date stays an ISO "YYYY-MM-DD" (Gregorian) string; only the calendar screen thinks in Shamsi months.
const P = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; // the Persian week starts on Saturday and ends on Friday

const DAY = 86400000;
const toMs = (iso) => Date.parse(iso + 'T00:00:00Z');
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);

export function toJalali(iso) {
  const p = Object.fromEntries(P.formatToParts(new Date(toMs(iso))).filter((x) => x.type !== 'literal').map((x) => [x.type, +x.value]));
  return { jy: p.year, jm: p.month, jd: p.day };
}
const key = (j) => j.jy * 10000 + j.jm * 100 + j.jd;

// Shamsi date -> ISO. Starts from an estimate (at most a couple of days off) and corrects it using Intl itself.
export function fromJalali(jy, jm, jd) {
  const target = jy * 10000 + jm * 100 + jd;
  const offset = jm <= 6 ? (jm - 1) * 31 : 186 + (jm - 7) * 30;
  let ms = Date.UTC(jy + 621, 2, 21) + (offset + jd - 1) * DAY;
  for (let i = 0; i < 6; i++) {
    const k = key(toJalali(toIso(ms)));
    if (k === target) break;
    ms += (k < target ? 1 : -1) * DAY;
  }
  return toIso(ms);
}
export function monthLength(jy, jm) {
  const ny = jm === 12 ? jy + 1 : jy, nm = jm === 12 ? 1 : jm + 1;
  return Math.round((toMs(fromJalali(ny, nm, 1)) - toMs(fromJalali(jy, jm, 1))) / DAY);
}
// position of a date in the week, Saturday = 0 ... Friday = 6
export const weekdayIndex = (iso) => (new Date(toMs(iso)).getUTCDay() + 1) % 7;

// Rows of 7 cells (Saturday first) for one Shamsi month. A cell is { iso, jd } or null for the empty days around the month.
export function monthGrid(jy, jm) {
  const first = fromJalali(jy, jm, 1), len = monthLength(jy, jm);
  const cells = Array(weekdayIndex(first)).fill(null);
  for (let d = 1; d <= len; d++) cells.push({ iso: toIso(toMs(first) + (d - 1) * DAY), jd: d });
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { first, last: toIso(toMs(first) + (len - 1) * DAY), weeks };
}
