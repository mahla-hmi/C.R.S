'use client';
// "↑ Calendar": scrolls back up to the month grid (shown on phones, where the day panel sits below the grid)
export default function JumpToMonth({ label, className = '' }) {
  return <button type="button" className={className} onClick={() => document.getElementById('cal-top')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>{label}</button>;
}
