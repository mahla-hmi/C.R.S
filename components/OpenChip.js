'use client';
import { useEffect, useState } from 'react';
import { cafeNow } from '@/lib/booking';
import { isOpenAt } from '@/lib/hours';

// The floating badge on the hero photo: shows the real opening hours, and its dot is green while the cafe is open right now
// (Tehran time, re-checked every 30 s) and red while it is closed. Before the page hydrates the dot is neutral grey.
export default function OpenChip({ hours, openLabel, closedLabel }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    const tick = () => setOpen(isOpenAt(cafeNow().min));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  const label = open === null ? '' : open ? openLabel : closedLabel;
  return (
    <div className={`chip ${open === null ? '' : open ? 'is-open' : 'is-closed'}`} title={label}>
      <span className="dot" />
      <span className="hrs">{hours.map((h) => <b key={h}>{h}</b>)}</span>
      {label && <span className="sr">{label}</span>}
    </div>
  );
}
