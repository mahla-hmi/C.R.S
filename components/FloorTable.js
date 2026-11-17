import { shapeOf, pickedChairs, zoneBands, CHAIR, place } from '@/lib/floor-shape';

// Soft areas behind the tables ("by the window", "terrace"). Decoration only.
export function ZoneBands({ tables, names }) {
  return zoneBands(tables).map((b) => (
    <div key={b.zone} className={`zn ${b.zone}`} aria-hidden="true"
      style={{ left: b.left + '%', top: b.top + '%', width: b.width + '%', height: b.height + '%' }}><span>{names?.[b.zone]}</span></div>
  ));
}

// One table of the floor plan, drawn from above with its chairs. A real <button>, so keyboard and screen readers work.
// state: 'free' | 'booked' | 'small' (not the size this party needs). The chosen table gets coloured chairs, one per guest.
export default function FloorTable({ id, seats, x, y, index, state, picked, guests, label, onPick }) {
  const g = shapeOf(seats);
  const on = picked ? pickedChairs(seats, guests) : null;
  const rank = on ? [...on] : [];
  return (
    <button type="button" disabled={state !== 'free'} aria-pressed={picked} aria-label={label} onClick={onPick}
      className={`tb ${state}${picked ? ' sel' : ''}`} style={{ ...place(x, y), '--vw': g.vbW, '--i': index }}>
      <svg viewBox={`0 0 ${g.vbW} ${g.vbH}`} aria-hidden="true" focusable="false">
        {picked && <rect className="halo" x="0" y="0" width={g.vbW} height={g.vbH} rx={Math.min(g.vbW, g.vbH) / 2} />}
        {g.chairs.map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot})`}>
            <rect className={`ch${on?.has(i) ? ' on' : ''}`} style={{ '--c': rank.indexOf(i) }} x={-CHAIR.w / 2} y={-CHAIR.h / 2} width={CHAIR.w} height={CHAIR.h} rx={CHAIR.h / 2} />
          </g>
        ))}
        {g.kind === 'round' ? <>
          <circle className="tt" cx={g.cx} cy={g.cy} r={g.r} />
          <circle className="tt-in" cx={g.cx} cy={g.cy} r={g.r - 3} />
        </> : <>
          <rect className="tt" x={g.x} y={g.y} width={g.w} height={g.h} rx="9" />
          <rect className="tt-in" x={g.x + 3} y={g.y + 3} width={g.w - 6} height={g.h - 6} rx="6" />
        </>}
        <text className="lb" x={g.cx} y={g.cy} textAnchor="middle">
          <tspan x={g.cx} dy="-0.1em" className="lb-id">{id}</tspan>
          <tspan x={g.cx} dy="1.25em" className="lb-n">{seats}</tspan>
        </text>
      </svg>
    </button>
  );
}
