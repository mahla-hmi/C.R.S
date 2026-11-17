import { cache } from 'react';
import AdminNav from './AdminNav';
import AdminBottomNav from './AdminBottomNav';
import { pendingCount } from '@/lib/admin/data';

// One DB read per request, shared by both navs. If the database is down the badge simply shows nothing
// (the pages themselves show the database error).
const getPending = cache(async () => { try { return await pendingCount(); } catch { return 0; } });

export async function SideNav(props) { return <AdminNav {...props} pending={props.canView ? await getPending() : 0} variant="side" />; }
export async function BottomNav(props) { return <AdminBottomNav {...props} pending={props.canView ? await getPending() : 0} />; }
