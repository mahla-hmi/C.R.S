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

// Menu page: search box + category chips + 3 sections of banner + item cards (same classes as the real menu, so nothing jumps)
export function MenuSkeleton({ label, instant, header = false }) {
  return (
    <Loading label={label} instant={instant}>
      {header && <div className="wrap mhead"><Sk w={110} h={34} r={12} /><Sk w={120} h={36} r={99} /></div>}
      <div className="mbar"><div className="wrap">
        <Sk h={46} r={99} style={{ marginBottom: 10 }} />
        <div className="chips">{[70, 96, 84, 76, 92, 80].map((w, i) => <Sk key={i} w={w + 30} h={38} r={99} style={{ flex: 'none' }} />)}</div>
      </div></div>
      <div className="wrap mlist">
        {[0, 1].map((c) => (
          <section className="mcat" key={c}>
            <Sk h={168} r={26} style={{ marginBottom: 14, height: 'var(--mh)' }} />
            <div className="mgrid">
              {[0, 1, 2, 3].map((i) => (
                <div className="mi" key={i} style={{ opacity: 1 }}><Sk w={72} h={72} r={15} style={{ flex: 'none' }} /><Sk w={W[(c * 2 + i) % W.length]} h={16} /><Sk w={64} h={16} style={{ marginInlineStart: 'auto' }} /></div>
              ))}
            </div>
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
