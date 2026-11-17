'use client';
import { useEffect } from 'react';

// A soft ripple from the touch point on buttons, chips and calendar days. Purely visual: the element keeps all its own behaviour.
// Skipped when the person asked the system for less motion.
const SEL = '.ad-btn,.ad-pill,.cal-arrow,.cal-cell,.rf-t,.rf-seg button,.ad-seg button,.ad-lang,.ad-out,.ad-pw button';
export default function RippleFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const down = (e) => {
      const el = e.target instanceof Element ? e.target.closest(SEL) : null;
      if (!el || el.disabled || el.classList.contains('off') || el.getAttribute('aria-disabled') === 'true') return;
      const r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
      const w = document.createElement('span');
      w.className = 'rp-wave';
      w.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      el.classList.add('rp-host');
      el.appendChild(w);
      const drop = () => w.remove();
      w.addEventListener('animationend', drop, { once: true });
      setTimeout(drop, 900); // safety net
    };
    document.addEventListener('pointerdown', down, { passive: true });
    return () => document.removeEventListener('pointerdown', down);
  }, []);
  return null;
}
