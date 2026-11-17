import { Sk } from '@/components/Skeleton';
import { AdminCalendarSkeleton, AdminDaySkeleton } from '@/components/admin/Skeletons';
import CalendarLoadingShell from '@/components/admin/CalendarLoadingShell';
export default function CalendarLoading() {
  return (
    <CalendarLoadingShell>
      <Sk w={110} h={30} r={10} style={{ margin: '10px 0 18px' }} />
      <div className="cal-wrap">
        <div className="cal-card"><Sk h={40} r={12} style={{ marginBottom: 12 }} /><AdminCalendarSkeleton bare /></div>
        <div><AdminDaySkeleton bare /></div>
      </div>
    </CalendarLoadingShell>
  );
}
