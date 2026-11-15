// Opening hours of the cafe (same every day), in minutes since midnight, Tehran time.
// Two shifts: 07:00-13:00 and 15:00-24:00. To change the hours, edit SHIFTS here and the two text lines in lib/dict.js ("hours" and the "info" row).
// NOTE: table booking has its own window (OPEN/CLOSE in lib/booking.js); it is not tied to these hours.
export const SHIFTS = [[7 * 60, 13 * 60], [15 * 60, 24 * 60]];
export const isOpenAt = (min) => SHIFTS.some(([a, b]) => min >= a && min < b);
