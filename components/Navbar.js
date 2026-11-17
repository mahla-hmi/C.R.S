'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function Navbar({ t, locale }) {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const f = () => setSolid(window.scrollY > 24);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const links = [...t.nav.map(([id, label]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>),
    <Link key="my" href={`/${locale}/my`} onClick={() => setOpen(false)}>{t.bn[3]}</Link>];
  return (
    <header className={`nav ${solid || open ? 'solid' : ''}`}>
      <div className="wrap nav-in">
        <a href="#top" className="logo">☕ {t.name}</a>
        <nav className="links">{links}</nav>
        <div className="nav-r">
          <Link href={`/${t.other}`} className="lang" aria-label="Language">{t.otherLabel}</Link>
          <Link href={`/${locale}/reserve`} className="btn sm">{t.cta}</Link>
          <button className={`burger ${open ? 'x' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><i /><i /></button>
        </div>
      </div>
      <nav className={`sheet ${open ? 'open' : ''}`}>{links}</nav>
    </header>
  );
}
