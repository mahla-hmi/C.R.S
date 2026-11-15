'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { swipeTarget } from '@/lib/swipe';

// Swipe the month card sideways to change month (phones). Works in both text directions:
// the "next" month is always the one you reveal by dragging the page away from its reading direction.
export default function SwipeMonth({ prev, next, className = '', children }) {
  const router = useRouter();
  const start = useRef(null);
  const onStart = (e) => { start.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null; };
  const onEnd = (e) => {
    const s = start.current; start.current = null;
    if (!s || !e.changedTouches[0]) return;
    const dir = swipeTarget({ dx: e.changedTouches[0].clientX - s.x, dy: e.changedTouches[0].clientY - s.y, dt: Date.now() - s.t, rtl: document.documentElement.dir === 'rtl' });
    const to = dir === 'next' ? next : dir === 'prev' ? prev : null;
    if (to) router.push(to, { scroll: false });
  };
  return <div className={className} onTouchStart={onStart} onTouchEnd={onEnd}>{children}</div>;
}
