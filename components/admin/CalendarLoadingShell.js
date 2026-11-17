'use client';
import { Loading } from '@/components/Skeleton';
import { useAdmin } from './LangProvider';
// the screen-reader wrapper of the calendar's loading screen (needs the panel language)
export default function CalendarLoadingShell({ children }) { return <Loading label={useAdmin().t.loading}>{children}</Loading>; }
