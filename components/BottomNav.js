'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 24px stroke icons: home, calendar+, cup, receipt
const ICONS = [
  <path key="a" d="M3.5 11.2 12 4l8.5 7.2M5.8 9.6v9.9c0 .6.4 1 1 1H10v-5.4h4v5.4h3.2c.6 0 1-.4 1-1V9.6" />,
  <g key="b"><rect x="4" y="5" width="16" height="15" rx="3.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4M12 13v4.5M9.75 15.25h4.5" /></g>,
  <g key="c"><path d="M5 9.5h11v4.6a4.4 4.4 0 0 1-4.4 4.4H9.4A4.4 4.4 0 0 1 5 14.1V9.5Z" /><path d="M16 11h1.4a2.1 2.1 0 0 1 0 4.2H16M8.5 3.5c0 1.3 1.1 1.4 1.1 2.7M12.2 3.5c0 1.3 1.1 1.4 1.1 2.7" /></g>,
  <g key="d"><path d="M6.2 3.5h11.6c.9 0 1.7.8 1.7 1.7v15.3l-3-1.8-2.9 1.8-2.9-1.8-2.9 1.8-3-1.8V5.2c0-.9.8-1.7 1.7-1.7Z" /><path d="M8.7 9h6.6M8.7 12.5h4" /></g>,
];

export default function BottomNav({ locale, labels }) {
  const path = usePathname() || '';
  const b = `/${locale}`;
  if (path.startsWith(`${b}/qr`)) return null; // printable sheet: no app chrome
  const hrefs = [b, `${b}/reserve`, `${b}/menu`, `${b}/my`];
  const idx = path === b ? 0 : hrefs.findIndex((h, i) => i > 0 && path.startsWith(h));
  return (
    <nav className="bnav" aria-label="Main" style={{ '--i': Math.max(idx, 0) }} data-none={idx < 0}>
      <div className="bn-in">
        <i className="bn-ind" aria-hidden="true" />
        {hrefs.map((h, i) => (
          <Link key={h} href={h} className={i === idx ? 'on' : ''} aria-current={i === idx ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[i]}</svg><span>{labels[i]}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
