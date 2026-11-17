import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { can } from '@/lib/admin/permissions';
import { db } from '@/lib/mongo';
import { getMenuAdmin, lastBulk } from '@/lib/admin/menu-ops';
import { photo } from '@/lib/images';
import MenuManager from '@/components/admin/MenuManager';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
import { AdminMenuSkeleton } from '@/components/admin/Skeletons';
export const dynamic = 'force-dynamic';

export default async function MenuAdminPage() {
  const { t } = await adminI18n();
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (!can(session, 'menu.manage')) return <NoAccess text={t.noAccess.menu} />;
  return (
    <>
      <div className="ad-head"><div><h1>{t.menu.title}</h1>
        <p className="ad-mut">{t.menu.sub}</p></div></div>
      <Suspense fallback={<AdminMenuSkeleton />}><MenuData isOwner={session.role === 'owner'} /></Suspense>
    </>
  );
}

// photo urls: an uploaded photo is served by /api/menu-image; a category without one shows the bundled file (public/images/menu-<id>-s.avif)
async function MenuData({ isOwner }) {
  let menu, last = null;
  try { const d = await db(); menu = await getMenuAdmin(d); if (isOwner) last = await lastBulk(d); }
  catch (e) { console.error('[admin] menu:', e?.message); return <DbError />; }
  const url = (im) => (im?.id ? `/api/menu-image/${im.id}?s=1` : null);
  const data = menu.map((c) => ({
    ...c,
    own: !!c.image, // true when the category has its own uploaded photo
    thumb: url(c.image) || photo(`menu-${c.id}-s`)?.src || null,
    items: c.items.map((i) => ({ ...i, thumb: url(i.image) })),
  }));
  return <MenuManager menu={data} isOwner={isOwner} last={last} />;
}
