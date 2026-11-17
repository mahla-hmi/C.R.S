// Pure helpers for the day board (no database): where a reservation sits on the OPEN..CLOSE time axis.
import { OPEN, CLOSE } from '../booking';

export const SPAN = CLOSE - OPEN;
export const pct = (min) => Math.min(100, Math.max(0, ((min - OPEN) / SPAN) * 100));
// { x, w } in percent of the axis, or null for old test data without times
export function segFor(r) {
  if (!Number.isFinite(r?.startMin) || !Number.isFinite(r?.endMin) || r.endMin <= r.startMin) return null;
  const x = pct(r.startMin);
  return { x, w: Math.max(2, pct(r.endMin) - x) };
}
// tick labels every two hours: [{ h, x }]
export const hourTicks = () => { const out = []; for (let h = Math.ceil(OPEN / 60 / 2) * 2; h * 60 <= CLOSE; h += 2) out.push({ h, x: pct(h * 60) }); return out; };
// Reservations that no longer hold the table (cancelled / rejected) are listed separately and never drawn on the axis.
export const DEAD = ['cancelled', 'rejected'];
export const isDead = (r) => DEAD.includes(r.status);
