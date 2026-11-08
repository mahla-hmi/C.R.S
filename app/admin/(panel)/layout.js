import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminBottomNav from '@/components/admin/AdminBottomNav';
import { SideNav, BottomNav } from '@/components/admin/PendingNav';
import LogoutButton from '@/components/admin/LogoutButton';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
import PushSetup from '@/components/admin/PushSetup';
import AdminShell from '@/components/admin/AdminShell';
import { getSession } from '@/lib/admin/server';
import { usingDefaults } from '@/lib/admin/auth';
import { can, ROLE_LABEL } from '@/lib/admin/permissions';
import { dict } from '@/lib/dict';
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }) {
  let session;
  try { session = await getSession(); } catch (e) { console.error('[admin] session:', e?.message); return <div className="ad-main"><DbError /></div>; }
  if (!session) redirect('/admin/login');
  const isOwner = session.role === 'owner', canView = can(session, 'reservations.view');
  const flags = { isOwner, canView };
  const brand = <div className="ad-brand"><span className="ad-logo">☕</span><div><b>{dict.fa.name}</b><small>پنل مدیریت</small></div></div>;
  const side = (
    <>
      {brand}
      {/* the menu shows at once; the red "pending" badge streams in when the database answers */}
      <Suspense fallback={<AdminNav variant="side" {...flags} />}><SideNav {...flags} /></Suspense>
      <div className="ad-user"><span><b>{session.name}</b><small>{ROLE_LABEL[session.role]}{session.primary ? ' · حساب اصلی' : ''}</small></span><LogoutButton /></div>
    </>
  );
  return (
    <AdminShell side={side} brand={brand} bottom={<Suspense fallback={<AdminBottomNav {...flags} />}><BottomNav {...flags} /></Suspense>}>
      {isOwner && usingDefaults() && <div className="ad-warn">رمز و کلید ورود کنونی آزمایشی است. <b>ADMIN_PASSWORD</b> و <b>ADMIN_SECRET</b> را در <b dir="ltr">.env.local</b> تنظیم کنید.</div>}
      <main className="ad-content">{canView && <PushSetup variant="banner" />}{isOwner || canView ? children : <NoAccess />}</main>
    </AdminShell>
  );
}
