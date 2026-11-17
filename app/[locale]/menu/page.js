import { Suspense } from 'react';
import Link from 'next/link';
import MenuClient from '@/components/MenuClient';
import { MenuSkeleton } from '@/components/Skeleton';
import { getMenu } from '@/lib/data';
import { dict } from '@/lib/dict';
import { photo } from '@/lib/images';
import { rd } from '@/lib/reserve-dict';
// reads the menu from MongoDB; the page shell is already on screen while this runs
async function MenuLoader({ locale, table }) {
  // Photos: one uploaded in the owner panel wins; otherwise the category falls back to the bundled file public/images/menu-<categoryId>.avif
  // (and menu-<categoryId>-s.avif); an item without its own photo shows its category's photo; nothing at all simply shows no photo.
  const up = (im, small) => (im?.id ? { src: `/api/menu-image/${im.id}${small ? '?s=1' : ''}`, lqip: im.lqip } : null);
  const menu = (await getMenu()).map((c) => {
    const img = up(c.img) || photo(`menu-${c.id}`), thumb = up(c.img, true) || photo(`menu-${c.id}-s`);
    return { ...c, img, thumb, items: c.items.map(({ img: own, ...i }) => ({ ...i, thumb: up(own, true) })) };
  });
  return <MenuClient menu={menu} locale={locale} table={table} />;
}
export default async function MenuPage({ params, searchParams }) {
  const { locale } = await params;
  const l = dict[locale] ? locale : 'fa';
  const sp = await searchParams;
  const t = dict[l];
  return (
    <main className="mn">
      <div className="wrap rs-top">
        <Link href={`/${l}`} className="back">{l === 'fa' ? '→' : '←'} {rd[l].back}</Link>
        <Link href={`/${t.other}/menu${sp?.table ? `?table=${sp.table}` : ''}`} className="lang">{t.otherLabel}</Link>
      </div>
      <div className="wrap mhead"><h1>{l === 'fa' ? 'منو' : 'Menu'}</h1><Link href={`/${l}/reserve`} className="btn sm">{t.cta}</Link></div>
      <Suspense fallback={<MenuSkeleton instant label={l === 'fa' ? 'در حال بارگذاری منو…' : 'Loading menu…'} />}>
        <MenuLoader locale={l} table={String(sp?.table || '').slice(0, 4)} />
      </Suspense>
    </main>
  );
}
