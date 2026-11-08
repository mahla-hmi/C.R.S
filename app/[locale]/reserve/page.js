import Link from 'next/link';
import ReserveClient from '@/components/ReserveClient';
import { dict } from '@/lib/dict';
import { rd } from '@/lib/reserve-dict';
export default async function ReservePage({ params, searchParams }) {
  const { locale } = await params;
  const l = dict[locale] ? locale : 'fa';
  const sp = await searchParams;
  return (
    <main className="rs">
      <div className="wrap rs-top">
        <Link href={`/${l}`} className="back">{l === 'fa' ? '→' : '←'} {rd[l].back}</Link>
        <Link href={`/${dict[l].other}/reserve`} className="lang">{dict[l].otherLabel}</Link>
      </div>
      <ReserveClient locale={l} t={rd[l]} special={sp?.special === '1'} />
    </main>
  );
}
