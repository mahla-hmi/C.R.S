import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Reveal from '@/components/Reveal';
import Photo from '@/components/Photo';
import { dict } from '@/lib/dict';

const P = {
  hero: 'photo-1495474472287-4d71bcdd2085', about: 'photo-1501339847302-ac426a4a7cbb', ev: 'photo-1464349095431-e9a21285b5f3',
  menu: ['photo-1510707577719-ae7c14805e3a', 'photo-1534040385115-33dcb3acba5b', 'photo-1495474472287-4d71bcdd2085', 'photo-1565958011703-44f9829ba187'],
  gal: ['photo-1442512595331-e89e73853f31', 'photo-1461023058943-07fcbe16d735', 'photo-1508739773434-c26b3d09e071', 'photo-1501339847302-ac426a4a7cbb', 'photo-1510707577719-ae7c14805e3a', 'photo-1565958011703-44f9829ba187'],
};
const Head = ({ k, t, c }) => (
  <Reveal className={`head ${c || ''}`}><span className="kicker">{k}</span><h2>{t}</h2></Reveal>
);

export default async function Home({ params }) {
  const { locale } = await params;
  const l = dict[locale] ? locale : 'fa';
  const t = dict[l];
  return (
    <>
      <Navbar t={t} locale={l} />
      <main id="top">
        {/* HERO */}
        <section className="hero">
          <i className="bean b1" /><i className="bean b2" /><i className="bean b3" />
          <div className="wrap hero-grid">
            <div className="hero-txt">
              <span className="badge a1">{t.badge}</span>
              <h1 className="a2">{t.h1a} <em>{t.h1b}</em> {t.h1c}</h1>
              <p className="a3">{t.sub}</p>
              <div className="row a4">
                <Link href={`/${l}/reserve`} className="btn">{t.cta}</Link>
                <Link href={`/${l}/menu`} className="btn ghost">{t.menuCta}</Link>
              </div>
              <div className="stats a5">{t.stats.map(([n, s]) => <div key={s}><b>{n}</b><span>{s}</span></div>)}</div>
            </div>
            <div className="hero-vis a2">
              <div className="steam"><i /><i /><i /></div>
              <div className="arch"><Photo id={P.hero} priority /></div>
              <div className="chip"><span className="dot" />{t.open}</div>
            </div>
          </div>
        </section>
        <div className="marq" aria-hidden="true"><div>{[0, 1].map((n) => <span key={n}>{t.marquee.map((m) => <b key={m + n}>{m} ✦</b>)}</span>)}</div></div>

        {/* ABOUT */}
        <section id="about"><div className="wrap two">
          <Reveal className="photo"><Photo id={P.about} /></Reveal>
          <div>
            <Head k={t.aboutK} t={t.aboutT} />
            {t.aboutP.map((p, i) => <Reveal as="p" key={i} delay={80 * (i + 1)} className="lead">{p}</Reveal>)}
            <Reveal delay={240} className="tags">{t.tags.map((x) => <span key={x}>{x}</span>)}</Reveal>
          </div>
        </div></section>

        {/* RESERVE STEPS */}
        <section id="reserve" className="dark"><div className="wrap">
          <Head k={t.resK} t={t.resT} c="center" />
          <div className="steps">{t.steps.map(([a, b], i) => (
            <Reveal key={a} delay={i * 80} className="step"><span className="num">{i + 1}</span><h3>{a}</h3><p>{b}</p></Reveal>
          ))}</div>
          <Reveal className="center"><Link href={`/${l}/reserve`} className="btn">{t.cta}</Link></Reveal>
        </div></section>

        {/* MENU */}
        <section id="menu"><div className="wrap">
          <Head k={t.menuK} t={t.menuT} c="center" />
          <div className="cards">{t.items.map(([n, d, p], i) => (
            <Reveal key={n} delay={i * 60} className="card">
              <div className="ph"><Photo id={P.menu[i]} /></div>
              <div className="cb"><h3>{n}</h3><p>{d}</p><b>{p}</b></div>
            </Reveal>
          ))}</div>
          <Reveal className="center note"><p>📱 {t.menuNote}</p><Link href={`/${l}/menu`} className="btn ghost">{t.menuCta}</Link></Reveal>
        </div></section>

        {/* EVENTS */}
        <section id="events" className="tint"><div className="wrap two rev">
          <div>
            <Head k={t.evK} t={t.evT} />
            <Reveal as="p" delay={80} className="lead">{t.evP}</Reveal>
            <Reveal delay={160} as="ul" className="list">{t.evList.map((x) => <li key={x}>{x}</li>)}</Reveal>
            <Reveal delay={240}><Link href={`/${l}/reserve?special=1`} className="btn">{t.evCta}</Link></Reveal>
          </div>
          <Reveal className="photo tilt"><Photo id={P.ev} /></Reveal>
        </div></section>

        {/* GALLERY */}
        <section><div className="wrap">
          <Head k={t.galK} t="" c="center" />
          <div className="gal">{P.gal.map((g, i) => <Reveal key={g + i} delay={i * 50} className={`g g${i}`}><Photo id={g} /></Reveal>)}</div>
        </div></section>

        {/* VISIT */}
        <section id="visit" className="dark"><div className="wrap">
          <Head k={t.visitK} t={t.visitT} c="center" />
          <div className="info">{t.info.map(([i, a, b], n) => (
            <Reveal key={a} delay={n * 80} className="ic"><span>{i}</span><h3>{a}</h3><p>{b}</p></Reveal>
          ))}</div>
        </div></section>
      </main>
      <footer><div className="wrap"><b>☕ {t.name}</b></div></footer>
    </>
  );
}
