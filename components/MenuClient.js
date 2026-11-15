'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

// Every item shows a photo of its category. To keep a long list from looking copy-pasted, each item crops the same
// photo a little differently: [zoom, focus x %, focus y %] (see .mi-p in globals.css).
const CROPS = [[1, 55, 58], [1.35, 55, 62], [1.7, 52, 58], [1.35, 42, 56]];
const Bg = (p) => (p?.lqip ? { backgroundImage: `url(${p.lqip})` } : undefined);

export default function MenuClient({ menu, locale, table }) {
  const fa = locale === 'fa';
  const [q, setQ] = useState('');
  const [active, setActive] = useState(menu[0].id);
  const bar = useRef(null);
  const nf = useMemo(() => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US'), [fa]);
  const unit = fa ? 'تومان' : 'T';
  const cats = useMemo(() => {
    const s = q.trim();
    return menu.map((c) => ({ ...c, items: s ? c.items.filter((i) => i.n.includes(s) || (i.ne || '').toLowerCase().includes(s.toLowerCase()) || c.fa.includes(s)) : c.items })).filter((c) => c.items.length);
  }, [q, menu]);

  // which category is on screen -> highlights its chip
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id.slice(2))), { rootMargin: '-25% 0px -65% 0px' });
    document.querySelectorAll('.mcat').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats]);
  useEffect(() => { bar.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [active]);

  // banners and item cards rise into view as they are scrolled to (the class is added on the element itself, React never removes it)
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px 8% 0px' });
    document.querySelectorAll('.mc-ban:not(.in),.mi:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats]);

  return (
    <>
      <div className="mbar"><div className="wrap fx-o">
        <div className="msw">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
          <input className="msearch" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={fa ? 'جستجو در منو…' : 'Search menu…'} aria-label={fa ? 'جستجو در منو' : 'Search menu'} />
          {q && <button type="button" className="mclr" onClick={() => setQ('')} aria-label={fa ? 'پاک کردن' : 'Clear'}>×</button>}
        </div>
        <div className="chips" ref={bar}>{menu.map((c) => (
          <a key={c.id} href={`#c-${c.id}`} className={active === c.id ? 'on' : ''}>
            {c.thumb && <i style={Bg(c.thumb)}><img src={c.thumb.src} alt="" width="28" height="28" loading="lazy" decoding="async" /></i>}
            {fa ? c.fa : c.en}
          </a>))}</div>
      </div></div>

      <div className="wrap mlist fx">
        {table && <p className="mtable">🪑 {fa ? 'میز' : 'Table'} {table}</p>}
        {cats.map((c, ci) => (
          <section key={c.id} id={`c-${c.id}`} className="mcat">
            <header className={`mc-ban${c.img ? '' : ' nopic'}`}>
              {c.img && (
                <span className="mc-pic" style={Bg(c.img)}>
                  <img src={c.img.src} alt="" width="480" height="480" loading={ci === 0 ? 'eager' : 'lazy'} decoding="async" />
                </span>
              )}
              <div className="mc-t">
                <h2>{fa ? c.fa : c.en}</h2>
                <span className="mc-n">{nf.format(c.items.length)} {fa ? 'مورد' : c.items.length === 1 ? 'item' : 'items'}</span>
              </div>
            </header>
            <div className="mgrid">
              {c.items.map((i, k) => {
                const [z, x, y] = i.thumb ? CROPS[0] : CROPS[k % CROPS.length]; // an item's own photo is shown whole
                const pic = i.thumb || c.thumb;
                return (
                  <article className="mi" key={i.n} style={{ '--d': `${(k % 6) * 45}ms` }}>
                    {pic && (
                      <span className="mi-p" style={{ ...Bg(pic), '--z': z, '--ox': `${x}%`, '--oy': `${y}%` }}>
                        <img src={pic.src} alt="" width="72" height="72" loading="lazy" decoding="async" />
                      </span>
                    )}
                    <h3 className="mi-n">{fa ? i.n : i.ne || i.n}</h3>
                    <p className="mi-pr"><b>{nf.format(i.p)}</b> <small>{unit}</small></p>
                  </article>
                );
              })}
            </div>
          </section>))}
        {!cats.length && <div className="mempty"><span aria-hidden="true">☕</span><p>{fa ? 'موردی یافت نشد' : 'Nothing found'}</p></div>}
      </div>
    </>
  );
}
