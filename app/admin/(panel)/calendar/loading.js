import { AdminCalendarSkeleton, AdminDaySkeleton, Sk, Loading } from '@/components/Skeleton';
export default function CalendarLoading() {
  return (
    <Loading label="در حال بارگذاری…">
      <Sk w={110} h={30} r={10} style={{ margin: '10px 0 18px' }} />
      <div className="cal-wrap">
        <div className="cal-card"><Sk h={40} r={12} style={{ marginBottom: 12 }} /><AdminCalendarSkeleton bare /></div>
        <div><AdminDaySkeleton bare /></div>
      </div>
    </Loading>
  );
}
