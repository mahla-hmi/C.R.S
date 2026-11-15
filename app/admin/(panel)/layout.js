import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { SideNav, BottomNav } from '@/components/admin/PendingNav';
import LogoutButton from '@/components/admin/LogoutButton';
import LangSwitch from '@/components/admin/LangSwitch';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
import PushSetup from '@/components/admin/PushSetup';
import AdminShell from '@/components/admin/AdminShell';
import { getSession } from '@/lib/admin/server';
import { usingDefaults } from '@/lib/admin/auth';
import { adminI18n } from '@/lib/admin/lang';
import { can } from '@/lib/admin/permissions';
import { dict } from '@/lib/dict';
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  const { lang, t } = await adminI18n();
  let session;
  try { session = await getSession(); } catch (e) { console.error('[admin] session:', e?.message); return <div className="ad-main"><DbError /></div>; }
  if (!session) redirect('/admin/login');
  const isOwner = session.role === 'owner', canView = can(session, 'reservations.view'), canMenu = can(session, 'menu.manage');
  const flags = { isOwner, canView, canMenu };
  const brand = <div className="ad-brand"><span className="ad-logo">☕</span><div><b>{dict[lang].name}</b><small>{t.panel}</small></div></div>;
  const [w0, w1, w2, w3] = t.devWarn;
  const side = (
    <>
      {brand}
      {/* the menu shows at once; the red "pending" badge streams in when the database answers */}
      <Suspense fallback={<AdminNav variant="side" {...flags} />}><SideNav {...flags} /></Suspense>
      <div className="ad-user"><span><b>{session.name}</b><small>{t.role[session.role]}{session.primary ? ` · ${t.mainAccount}` : ''}</small></span><LangSwitch /><LogoutButton /></div>
    </>
  );
  return (
    <AdminShell side={side} brand={brand} bottom={<Suspense fallback={<AdminBottomNav {...flags} />}><BottomNav {...flags} /></Suspense>}>
      {isOwner && usingDefaults() && <div className="ad-warn">{w0} <b>ADMIN_PASSWORD</b> {w1} <b>ADMIN_SECRET</b> {w2} <b dir="ltr">.env.local</b>{w3}</div>}
      <main className="ad-content">{canView && <PushSetup variant="banner" />}{isOwner || canView || canMenu ? children : <NoAccess />}</main>
    </AdminShell>
  );
}
