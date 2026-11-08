import { Sk, Loading } from '@/components/Skeleton';
export default function PanelLoading() {
  return (
    <Loading label="در حال بارگذاری…">
      <Sk w={220} h={30} r={10} style={{ marginBottom: 18 }} />
      <div className="ad-stats">{[0, 1, 2, 3].map((i) => <Sk key={i} h={92} r={18} />)}</div>
      <div className="ad-cards" style={{ marginTop: 22 }}>{[0, 1, 2].map((i) => <Sk key={i} h={210} r={18} />)}</div>
    </Loading>
  );
}
