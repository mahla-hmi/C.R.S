'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  cal: <><rect x="4" y="5" width="16" height="15" rx="3.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4M9 15l2 2 4-4" /></>,
  month: <><rect x="4" y="5" width="16" height="15" rx="3.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  team: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16 14.2c2.6-.3 4.4 1.2 4.9 4" /></>,
  bag: <><path d="M6 8h12l-1 11.2a1.5 1.5 0 0 1-1.5 1.3h-7A1.5 1.5 0 0 1 7 19.2L6 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
};
// Desktop sidebar. Items depend on what the signed-in person may do (the server checks again on every page and API call).
export default function AdminNav({ pending = 0, variant = 'side', isOwner = false, canView = true }) {
  const path = usePathname() || '';
  const items = [
    canView && { href: '/admin', label: 'داشبورد', icon: 'grid', exact: true },
    canView && { href: '/admin/reservations', label: 'رزروها', icon: 'cal', badge: true },
    canView && { href: '/admin/calendar', label: 'تقویم', icon: 'month' },
    isOwner && { href: '/admin/team', label: 'مدیریت اعضا', icon: 'team' },
    { label: 'سفارش‌ها', icon: 'bag', soon: true }, // online ordering does not exist yet
  ].filter(Boolean);
  return (
    <nav className={`ad-nav ${variant}`} aria-label="منوی مدیریت">
      {items.map((it) => {
        const body = (<><svg viewBox="0 0 24 24" aria-hidden="true">{I[it.icon]}</svg><span>{it.label}</span>
          {it.badge && pending > 0 && <em className="ad-count">{pending.toLocaleString('fa-IR')}</em>}
          {it.soon && <small className="ad-soon">به‌زودی</small>}</>);
        if (it.soon) return <span key={it.label} className="ad-link off" aria-disabled="true" title={it.label}>{body}</span>;
        const on = it.exact ? path === it.href : path.startsWith(it.href);
        return <Link key={it.href} href={it.href} title={it.label} className={`ad-link${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>{body}</Link>;
      })}
    </nav>
  );
}
