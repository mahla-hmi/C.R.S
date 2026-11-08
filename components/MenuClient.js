'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
export default function MenuClient({ menu, locale, table }) {
  const fa = locale === 'fa';
  const [q, setQ] = useState('');
  const [active, setActive] = useState(menu[0].id);
  const bar = useRef(null);
  const price = (p) => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US').format(p) + (fa ? ' تومان' : ' T');
  const cats = useMemo(() => {
    const s = q.trim();
    return menu.map((c) => ({ ...c, items: s ? c.items.filter((i) => i.n.includes(s) || c.fa.includes(s)) : c.items })).filter((c) => c.items.length);
  }, [q, menu]);
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id.slice(2))), { rootMargin: '-25% 0px -65% 0px' });
    document.querySelectorAll('.mcat').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats]);
  useEffect(() => { bar.current?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [active]);
  return (
    <>
      <div className="mbar"><div className="wrap fx-o">
        <input className="msearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder={fa ? 'جستجو در منو…' : 'Search menu…'} />
        <div className="chips" ref={bar}>{menu.map((c) => (
          <a key={c.id} href={`#c-${c.id}`} className={active === c.id ? 'on' : ''}>{fa ? c.fa : c.en}</a>))}</div>
      </div></div>
      <div className="wrap mlist fx">
        {table && <p className="mtable">🪑 {fa ? 'میز' : 'Table'} {table}</p>}
        {cats.map((c) => (
          <section key={c.id} id={`c-${c.id}`} className="mcat">
            <h2>{fa ? c.fa : c.en}</h2>
            {c.items.map((i) => <div className="it" key={i.n}><span>{i.n}</span><i /><b>{price(i.p)}</b></div>)}
          </section>))}
        {!cats.length && <p className="mut center">—</p>}
      </div>
    </>
  );
}
