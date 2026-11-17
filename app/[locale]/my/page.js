import Link from 'next/link';
import MyClient from '@/components/MyClient';
import { dict } from '@/lib/dict';
import { rd } from '@/lib/reserve-dict';
import { md } from '@/lib/my-dict';
export default async function MyPage({ params }) {
  const { locale } = await params;
  const l = dict[locale] ? locale : 'fa';
  return (
    <main className="rs">
      <div className="wrap rs-top">
        <Link href={`/${l}`} className="back">{l === 'fa' ? '→' : '←'} {md[l].back}</Link>
        <Link href={`/${dict[l].other}/my`} className="lang">{dict[l].otherLabel}</Link>
      </div>
      <MyClient locale={l} t={md[l]} r={rd[l]} />
    </main>
  );
}
