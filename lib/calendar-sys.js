// One interface for the month calendar in both languages: Shamsi for Persian, Gregorian for English.
// Dates stay ISO "YYYY-MM-DD" (Gregorian) everywhere; a "system" only converts to/from (year, month, day) and lays out a month.
import { toJalali, fromJalali, monthLength, monthGrid, weekdayIndex, MONTHS, WEEKDAYS } from './jalali-cal';

const pad = (n) => String(n).padStart(2, '0');
const G_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const G_WEEKDAYS = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']; // the cafe's week also starts on Saturday and ends on Friday
const gParts = (iso) => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10) });
const gMake = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const gLen = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function gGrid(y, m) {
  const first = gMake(y, m, 1), len = gLen(y, m);
  const cells = Array(weekdayIndex(first)).fill(null);
  for (let d = 1; d <= len; d++) cells.push({ iso: gMake(y, m, d), jd: d });
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { first, last: gMake(y, m, len), weeks };
}

const J = { id: 'j', MONTHS, WEEKDAYS, MIN: 1380, MAX: 1450, parts: (iso) => { const j = toJalali(iso); return { y: j.jy, m: j.jm, d: j.jd }; }, make: fromJalali, len: monthLength, grid: monthGrid };
const G = { id: 'g', MONTHS: G_MONTHS, WEEKDAYS: G_WEEKDAYS, MIN: 2000, MAX: 2100, parts: gParts, make: gMake, len: gLen, grid: gGrid };
export const calSys = (lang) => (lang === 'fa' ? J : G);
