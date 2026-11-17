// Top-down drawing of one table with its chairs (used by components/FloorTable.js). Pure functions: no React, no DOM.
// Everything is in SVG units; the component scales the drawing with CSS, so a 6-seat table looks bigger than a 2-seat one.
//   1-2 seats  -> small round table, chairs on opposite sides
//   3-4 seats  -> rectangular table, chairs along both long sides
//   5+ seats   -> larger round table, chairs all around
export const CHAIR = { w: 15, h: 7, gap: 4 }; // a chair is a small rounded bar placed `gap` away from the table edge
const PAD = 3;
const rnd = (n) => Math.round(n * 100) / 100;

function round(seats, r) {
  const d = r + CHAIR.gap + CHAIR.h / 2;        // distance from the table centre to a chair centre
  const half = r + CHAIR.gap + CHAIR.h + PAD;   // half the size of the whole drawing
  const chairs = Array.from({ length: seats }, (_, i) => {
    const a = ((-90 + (360 / seats) * i) * Math.PI) / 180; // first chair at the top, then clockwise
    return { x: rnd(half + d * Math.cos(a)), y: rnd(half + d * Math.sin(a)), rot: rnd((a * 180) / Math.PI + 90) };
  });
  return { kind: 'round', vbW: rnd(half * 2), vbH: rnd(half * 2), cx: half, cy: half, r, chairs };
}

function rect(seats) {
  const top = Math.ceil(seats / 2), bottom = seats - top, per = Math.max(top, bottom);
  const tw = per * CHAIR.w + (per + 1) * 6, th = 28;
  const ty = PAD + CHAIR.h + CHAIR.gap;
  const vbW = tw + PAD * 2, vbH = th + 2 * (CHAIR.gap + CHAIR.h) + PAD * 2;
  const row = (n, y) => Array.from({ length: n }, (_, i) => ({ x: rnd(PAD + (tw * (i + 0.5)) / n), y, rot: 0 }));
  return {
    kind: 'rect', vbW, vbH, cx: vbW / 2, cy: ty + th / 2, x: PAD, y: ty, w: tw, h: th,
    chairs: [...row(top, PAD + CHAIR.h / 2), ...row(bottom, ty + th + CHAIR.gap + CHAIR.h / 2)],
  };
}

export function shapeOf(seats) {
  const n = Math.max(1, Math.round(Number(seats) || 1));
  if (n <= 2) return round(n, 15);
  if (n <= 4) return rect(n);
  return round(n, Math.min(34, 17 + n * 1.35));
}

// Which chairs to colour for a party of `guests` at a table with `seats` chairs: spread around the table, not bunched together.
export function pickedChairs(seats, guests) {
  const n = Math.max(1, Math.round(seats)), k = Math.min(n, Math.max(0, Math.round(guests)));
  return new Set(Array.from({ length: k }, (_, j) => Math.floor((j * n) / k)));
}

// The floor-plan coordinates in the database are 0-100 %. They are pulled in a little so a table at the edge never gets cut off.
export const FLOOR_RATIO = 1.3;    // floor height = width x this (keep in sync with .floor in globals.css)
export const TABLE_SCALE = 0.27;   // drawing width in % of the floor width = vbW x this (keep in sync with .tb in globals.css)
export const place = (x, y) => ({ left: rnd(7 + x * 0.86) + '%', top: rnd(6 + y * 0.88) + '%' });

// Soft tinted areas behind the tables of a zone (by the window, on the terrace), sized from the tables inside them. In % of the floor.
export function zoneBands(tables, zones = ['window', 'terrace']) {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  return zones.flatMap((zone) => {
    const ts = (tables || []).filter((t) => t.zone === zone);
    if (!ts.length) return [];
    const bs = ts.map((t) => {
      const g = shapeOf(t.seats), p = place(t.x, t.y), w = g.vbW * TABLE_SCALE, h = (g.vbH * TABLE_SCALE) / FLOOR_RATIO, l = parseFloat(p.left), tp = parseFloat(p.top);
      return [l - w / 2, l + w / 2, tp - h / 2, tp + h / 2];
    });
    const x0 = clamp(Math.min(...bs.map((b) => b[0])) - 0.6, 1, 99), x1 = clamp(Math.max(...bs.map((b) => b[1])) + 0.6, 1, 99);
    const y0 = clamp(Math.min(...bs.map((b) => b[2])) - 6, 1, 99), y1 = clamp(Math.max(...bs.map((b) => b[3])) + 2.5, 1, 99);
    return [{ zone, left: rnd(x0), top: rnd(y0), width: rnd(x1 - x0), height: rnd(y1 - y0) }];
  });
}
