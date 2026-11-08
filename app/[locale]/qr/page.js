import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { getTables } from '@/lib/data';
// Printable QR codes, one per table: /fa/qr
export default async function QrPage({ params }) {
  const { locale } = await params;
  const h = await headers();
  const host = h.get('host') || 'localhost:3000';
  const base = process.env.SITE_URL || `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`;
  const tables = await getTables();
  const items = await Promise.all(tables.map(async (t) => ({ id: t.id, url: `${base}/${locale}/menu?table=${t.id}`, src: await QRCode.toDataURL(`${base}/${locale}/menu?table=${t.id}`, { margin: 1, width: 240 }) })));
  return (
    <main className="wrap qrp"><h1>QR · {base}</h1>
      <div className="qrg">{items.map((i) => <figure key={i.id}><img src={i.src} alt={i.id} /><figcaption>{i.id}</figcaption></figure>)}</div></main>
  );
}
