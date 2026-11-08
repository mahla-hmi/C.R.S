'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LogoutButton from './LogoutButton';

// The panel frame. The sidebar can be opened and closed everywhere:
//  - phones/tablets (< 900px): a drawer that slides in from the right, with a dimmed backdrop
//  - desktop: collapses to a narrow icon rail and expands again (the choice is remembered on this device)
const KEY = 'ad-side-collapsed';
const Burger = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
const Close = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>;

export default function AdminShell({ side, brand, bottom, children }) {
  const path = usePathname();
  const [desktop, setDesktop] = useState(false);
  const [open, setOpen] = useState(false);           // drawer (phones, tablets)
  const [collapsed, setCollapsed] = useState(false); // icon rail (desktop)

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === '1'); } catch {}
    const mq = window.matchMedia('(min-width: 900px)');
    const sync = () => { setDesktop(mq.matches); if (mq.matches) setOpen(false); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  useEffect(() => { setOpen(false); }, [path]); // going to another page closes the drawer
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind the drawer does not scroll
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = before; };
  }, [open]);

  const toggle = () => {
    if (desktop) {
      const next = !collapsed;
      setCollapsed(next);
      try { localStorage.setItem(KEY, next ? '1' : '0'); } catch {}
    } else setOpen(!open);
  };
  const expanded = desktop ? !collapsed : open;
  return (
    <div className={`ad-app${collapsed ? ' rail' : ''}${open ? ' drawer-open' : ''}`}>
      <aside id="ad-side" className="ad-side" aria-label="منوی کناری" onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
        <button type="button" className="ad-close" onClick={() => setOpen(false)} aria-label="بستن منو"><Close /></button>
        {side}
      </aside>
      <div className="ad-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="ad-main">
        <header className="ad-top">
          <button type="button" className="ad-burger" onClick={toggle} aria-controls="ad-side" aria-expanded={expanded} aria-label={expanded ? 'بستن منوی کناری' : 'باز کردن منوی کناری'}><Burger /></button>
          {brand}
          <LogoutButton />
        </header>
        {children}
      </div>
      {bottom}
    </div>
  );
}
