'use client';
// Skeletons of the admin screens. They read the panel language for the screen-reader label.
import { Sk, Loading } from '@/components/Skeleton';
import { useAdmin } from './LangProvider';

const useLabel = (label) => { const a = useAdmin(); return label ?? a?.t.loading; };
const Wrap = ({ bare, label, children }) => { const l = useLabel(label); return bare ? <>{children}</> : <Loading label={l}>{children}</Loading>; };

// "reservations": [title + search box] + count + filter pills + cards. shell = also draw the title and search box (loading.js)
export const AdminListSkeleton = ({ label, shell = false, n = 4 }) => (
  <Wrap label={label}>
    {shell && <><Sk w={120} h={30} r={10} style={{ margin: '10px 0 18px' }} /><Sk h={46} r={14} style={{ marginBottom: 14 }} /></>}
    <Sk w={110} h={16} style={{ marginBottom: 12 }} />
    <div className="ad-views">{[74, 112, 96, 92, 84].map((w, i) => <Sk key={i} w={w} h={38} r={99} style={{ flex: 'none' }} />)}</div>
    <div className="ad-cards">{Array.from({ length: n }, (_, i) => <Sk key={i} h={210} r={18} />)}</div>
  </Wrap>
);
// "team": intro + add button + member cards
export const AdminTeamSkeleton = ({ label, shell = false, n = 3 }) => (
  <Wrap label={label}>
    {shell && <><Sk w={170} h={30} r={10} style={{ margin: '10px 0 8px' }} /><Sk w={300} h={14} style={{ marginBottom: 18 }} /></>}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}><Sk w={200} h={14} /><Sk w={130} h={40} r={12} /></div>
    <div className="ad-cards">{Array.from({ length: n }, (_, i) => <Sk key={i} h={190} r={18} />)}</div>
  </Wrap>
);
// menu management: toolbar + category cards
export const AdminMenuSkeleton = ({ label, shell = false, n = 4 }) => (
  <Wrap label={label}>
    {shell && <><Sk w={170} h={30} r={10} style={{ margin: '10px 0 8px' }} /><Sk w={320} h={14} style={{ marginBottom: 18 }} /></>}
    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}><Sk h={44} r={14} style={{ flex: 1 }} /><Sk w={140} h={44} r={12} /></div>
    <div style={{ display: 'grid', gap: 12 }}>{Array.from({ length: n }, (_, i) => <Sk key={i} h={82} r={18} />)}</div>
  </Wrap>
);
// calendar: month grid and day panel. bare = no wrapper (loading.js already provides one)
export const AdminCalendarSkeleton = ({ label, bare = false }) => (
  <Wrap bare={bare} label={label}>
    <Sk w={230} h={18} style={{ marginBottom: 12 }} />
    <div className="cal-grid">{Array.from({ length: 35 }, (_, i) => <Sk key={i} h={54} r={14} />)}</div>
  </Wrap>
);
export const AdminDaySkeleton = ({ label, bare = false }) => (
  <Wrap bare={bare} label={label}>
    <Sk w={200} h={26} r={10} style={{ marginBottom: 14 }} />
    <div className="cal-stats">{[0, 1, 2, 3].map((i) => <Sk key={i} h={84} r={18} />)}</div>
    <div style={{ display: 'grid', gap: 8, marginTop: 22 }}>{Array.from({ length: 6 }, (_, i) => <Sk key={i} h={30} r={10} />)}</div>
    <div className="ad-cards" style={{ marginTop: 22 }}>{[0, 1].map((i) => <Sk key={i} h={210} r={18} />)}</div>
  </Wrap>
);
// forms (manual booking)
export const AdminFormSkeleton = ({ label, shell = false }) => (
  <Wrap label={label}>
    {shell && <Sk w={150} h={30} r={10} style={{ margin: '10px 0 18px' }} />}
    <div style={{ display: 'grid', gap: 14 }}>{[150, 220, 170].map((h, i) => <Sk key={i} h={h} r={18} />)}</div>
  </Wrap>
);
// dashboard (the panel's default loading screen)
export const AdminPanelSkeleton = ({ label }) => (
  <Wrap label={label}>
    <Sk w={220} h={30} r={10} style={{ marginBottom: 18 }} />
    <div className="ad-stats">{[0, 1, 2, 3].map((i) => <Sk key={i} h={92} r={18} />)}</div>
    <div className="ad-cards" style={{ marginTop: 22 }}>{[0, 1, 2].map((i) => <Sk key={i} h={210} r={18} />)}</div>
  </Wrap>
);
