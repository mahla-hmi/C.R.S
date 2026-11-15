import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { db } from '@/lib/mongo';
import { listMembers } from '@/lib/admin/team-ops';
import { adminName } from '@/lib/admin/auth';
import TeamManager from '@/components/admin/TeamManager';
import NoAccess from '@/components/admin/NoAccess';
import DbError from '@/components/admin/DbError';
import { AdminTeamSkeleton } from '@/components/admin/Skeletons';
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const { t } = await adminI18n();
  let session;
  try { session = await getSession(); } catch { return <DbError />; }
  if (!session) redirect('/admin/login');
  if (session.role !== 'owner') return <NoAccess text={t.noAccess.team} />;
  return (
    <>
      <div className="ad-head"><div><h1>{t.team.title}</h1>
        <p className="ad-mut">{t.team.sub}</p></div></div>
      <Suspense fallback={<AdminTeamSkeleton />}><TeamData session={session} /></Suspense>
    </>
  );
}

async function TeamData({ session }) {
  let members;
  try { members = await listMembers((await db()).collection('admins')); }
  catch (e) { console.error('[admin] team:', e?.message); return <DbError />; }
  return <TeamManager members={members} meId={session.id} mePrimary={session.primary} primaryName={adminName()} />;
}
