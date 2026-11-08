'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Floating bottom bar for phones and tablets: same look and sliding indicator as the public site's BottomNav.
const ALL = [
  { href: '/admin', label: 'داشبورد', exact: true, need: 'view', icon: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></> },
  { href: '/admin/reservations', label: 'رزروها', badge: true, need: 'view', icon: <><rect x="4" y="5" width="16" height="15" rx="3.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4M9 15l2 2 4-4" /></> },
  { href: '/admin/calendar', label: 'تقویم', need: 'view', icon: <><rect x="4" y="5" width="16" height="15" rx="3.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></> },
  { href: '/admin/team', label: 'اعضا', need: 'owner', icon: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16 14.2c2.6-.3 4.4 1.2 4.9 4" /></> },
];

export default function AdminBottomNav({ pending = 0, isOwner = false, canView = true }) {
  const path = usePathname() || '';
  const items = ALL.filter((it) => !it.need || (it.need === 'owner' ? isOwner : canView));
  if (!items.length) return null; // nothing to navigate to (a member without any permission)
  const idx = items.findIndex((it) => (it.exact ? path === it.href : path.startsWith(it.href)));
  return (
    <nav className="ad-bnav" aria-label="منوی اصلی مدیریت" style={{ '--i': Math.max(idx, 0), '--n': items.length }} data-none={idx < 0}>
      <div className="ad-bn-in">
        <i className="ad-bn-ind" aria-hidden="true" />
        {items.map((it, i) => {
          const body = (
            <>
              <span className="ad-bn-ico">
                <svg viewBox="0 0 24 24" aria-hidden="true">{it.icon}</svg>
                {it.badge && pending > 0 && <em className="ad-bn-badge">{pending.toLocaleString('fa-IR')}</em>}
              </span>
              <span>{it.label}</span>
            </>
          );
          return <Link key={it.href} href={it.href} className={i === idx ? 'on' : ''} aria-current={i === idx ? 'page' : undefined}>{body}</Link>;
        })}
      </div>
    </nav>
  );
}
