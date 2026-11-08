// Skeleton loaders: grey shapes shaped like the real content, with a soft shimmer.
// Plain markup (no hooks) so server components, loading.js and client components can all use them.
// They fade in only if loading takes longer than ~150 ms, so fast responses never flash a skeleton.
export const Sk = ({ w, h = 14, r = 10, style, className = '' }) => (
  <span className={`sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

// wrapper: announces "loading" to screen readers; instant = no fade-in delay (used when a page shell is already visible)
export function Loading({ label = 'Loading…', instant = false, className = '', children }) {
  return (
    <div className={`skw${instant ? ' now' : ''} ${className}`} role="status" aria-live="polite" aria-busy="true">
      <span className="sr">{label}</span>{children}
    </div>
  );
}

const W = ['58%', '44%', '66%', '38%', '52%', '47%'];

// Menu page: search box + category chips + 3 sections of price rows (same classes as the real menu, so nothing jumps)
export function MenuSkeleton({ label, instant, header = false }) {
  return (
    <Loading label={label} instant={instant}>
      {header && <div className="wrap mhead"><Sk w={110} h={34} r={12} /><Sk w={120} h={36} r={99} /></div>}
      <div className="mbar"><div className="wrap">
        <Sk h={46} r={14} style={{ marginBottom: 8 }} />
        <div className="chips">{[70, 96, 84, 76, 92, 80].map((w, i) => <Sk key={i} w={w} h={34} r={99} style={{ flex: 'none' }} />)}</div>
      </div></div>
      <div className="wrap mlist">
        {[0, 1, 2].map((c) => (
          <section className="mcat" key={c}>
            <Sk w={150 + c * 14} h={26} r={10} style={{ marginBottom: 12 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="it sk-row" key={i}><Sk w={W[(c * 2 + i) % W.length]} h={16} /><Sk w={72} h={16} /></div>
            ))}
          </section>
        ))}
      </div>
    </Loading>
  );
}

// Reserve step 2: grid of start-time buttons
export const SlotsSkeleton = ({ label, n = 16 }) => (
  <Loading label={label}><div className="slots t4">{Array.from({ length: n }, (_, i) => <Sk key={i} h={42} r={14} />)}</div></Loading>
);

// Reserve step 3: the floor plan with round table placeholders (positions mirror the default layout)
const SPOTS = [[12, 14], [12, 38], [12, 66], [40, 18], [40, 48], [42, 80], [68, 14], [68, 42], [68, 68], [90, 22], [90, 54], [90, 82]];
export const FloorSkeleton = ({ label }) => (
  <Loading label={label}>
    <div className="floor sk-floor">{SPOTS.map(([x, y], i) => <Sk key={i} className="sk-tb" style={{ left: x + '%', top: y + '%' }} />)}</div>
  </Loading>
);

// "My bookings": booking cards
export const CardsSkeleton = ({ label, n = 3 }) => (
  <Loading label={label} className="mr-list">
    {Array.from({ length: n }, (_, i) => (
      <div className="mr-card" key={i}>
        <header><Sk w={130} h={18} /><Sk w={92} h={24} r={99} /></header>
        <Sk w={190} h={30} r={10} />
        <div className="mr-meta"><Sk w={70} h={16} /><Sk w={64} h={16} /><Sk w={90} h={16} /></div>
        <Sk w={150} h={14} />
      </div>
    ))}
  </Loading>
);

// QR sheet: grid of squares
export const QrSkeleton = ({ label }) => (
  <Loading label={label}><div className="qrg">{Array.from({ length: 8 }, (_, i) => <Sk key={i} h={196} r={16} />)}</div></Loading>
);

// Admin "reservations": [title + search box] + filter pills + cards. shell = also draw the title and search box
// (used by loading.js, when the whole page is still on its way).
export const AdminListSkeleton = ({ label = 'در حال بارگذاری…', shell = false, n = 4 }) => (
  <Loading label={label}>
    {shell && <><Sk w={120} h={30} r={10} style={{ margin: '10px 0 18px' }} /><Sk h={46} r={14} style={{ marginBottom: 14 }} /></>}
    <Sk w={110} h={16} style={{ marginBottom: 12 }} />
    <div className="ad-views">{[74, 112, 96, 92, 84].map((w, i) => <Sk key={i} w={w} h={38} r={99} style={{ flex: 'none' }} />)}</div>
    <div className="ad-cards">{Array.from({ length: n }, (_, i) => <Sk key={i} h={210} r={18} />)}</div>
  </Loading>
);

// Admin "team management": intro + add button + member cards. shell = also draw the title (used by loading.js).
export const AdminTeamSkeleton = ({ label = 'در حال بارگذاری…', shell = false, n = 3 }) => (
  <Loading label={label}>
    {shell && <><Sk w={170} h={30} r={10} style={{ margin: '10px 0 8px' }} /><Sk w={300} h={14} style={{ marginBottom: 18 }} /></>}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}><Sk w={200} h={14} /><Sk w={130} h={40} r={12} /></div>
    <div className="ad-cards">{Array.from({ length: n }, (_, i) => <Sk key={i} h={190} r={18} />)}</div>
  </Loading>
);

// Admin calendar: month grid and day panel. bare = no wrapper (loading.js already provides one).
const Wrap = ({ bare, label, children }) => (bare ? <>{children}</> : <Loading label={label}>{children}</Loading>);
export const AdminCalendarSkeleton = ({ label = 'در حال بارگذاری…', bare = false }) => (
  <Wrap bare={bare} label={label}>
    <Sk w={230} h={18} style={{ marginBottom: 12 }} />
    <div className="cal-grid">{Array.from({ length: 35 }, (_, i) => <Sk key={i} h={54} r={14} />)}</div>
  </Wrap>
);
export const AdminDaySkeleton = ({ label = 'در حال بارگذاری…', bare = false }) => (
  <Wrap bare={bare} label={label}>
    <Sk w={200} h={26} r={10} style={{ marginBottom: 14 }} />
    <div className="cal-stats">{[0, 1, 2, 3].map((i) => <Sk key={i} h={84} r={18} />)}</div>
    <div style={{ display: 'grid', gap: 8, marginTop: 22 }}>{Array.from({ length: 6 }, (_, i) => <Sk key={i} h={30} r={10} />)}</div>
    <div className="ad-cards" style={{ marginTop: 22 }}>{[0, 1].map((i) => <Sk key={i} h={210} r={18} />)}</div>
  </Wrap>
);

// Admin forms (manual reservation): a title and a few cards of fields.
export const AdminFormSkeleton = ({ label = 'در حال بارگذاری…', shell = false }) => (
  <Loading label={label}>
    {shell && <Sk w={150} h={30} r={10} style={{ margin: '10px 0 18px' }} />}
    <div style={{ display: 'grid', gap: 14 }}>{[150, 220, 170].map((h, i) => <Sk key={i} h={h} r={18} />)}</div>
  </Loading>
);
