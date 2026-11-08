'use client';
import { useEffect } from 'react';
// On phones and tablets the day panel sits below the month grid, so after a day is chosen the page scrolls down to it.
// On wide screens the two are side by side and nothing moves.
export default function ScrollToDay({ target = 'day-detail' }) {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 1099px)').matches) return;
    document.getElementById(target)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [target]);
  return null;
}
