import { Suspense } from 'react';
import Link from 'next/link';
import MenuClient from '@/components/MenuClient';
import { MenuSkeleton } from '@/components/Skeleton';
import { getMenu } from '@/lib/data';
import { dict } from '@/lib/dict';
// reads the menu from MongoDB; the page shell is already on screen while this runs
async function MenuLoader({ locale, table }) {
  const menu = await getMenu();
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
        <Link href={`/${l}`} className="back">☕ {t.name}</Link>
        <Link href={`/${t.other}/menu${sp?.table ? `?table=${sp.table}` : ''}`} className="lang">{t.otherLabel}</Link>
      </div>
      <div className="wrap mhead"><h1>{l === 'fa' ? 'منو' : 'Menu'}</h1><Link href={`/${l}/reserve`} className="btn sm">{t.cta}</Link></div>
      <Suspense fallback={<MenuSkeleton instant label={l === 'fa' ? 'در حال بارگذاری منو…' : 'Loading menu…'} />}>
        <MenuLoader locale={l} table={String(sp?.table || '').slice(0, 4)} />
      </Suspense>
    </main>
  );
}
