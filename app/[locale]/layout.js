import { Vazirmatn, Playfair_Display } from 'next/font/google';
import { dict } from '@/lib/dict';
import BottomNav from '@/components/BottomNav';
import '../globals.css';
const vz = Vazirmatn({ subsets: ['arabic', 'latin'], variable: '--vz' });
const pf = Playfair_Display({ subsets: ['latin'], variable: '--pf' });
// viewport-fit=cover lets the bottom bar respect the iPhone home-indicator inset
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return { title: dict[locale]?.name ?? 'Café', description: dict[locale]?.sub };
}
export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  const l = dict[locale] ? locale : 'fa';
  return (
    <html lang={l} dir={dict[l].dir}>
      <body className={`${vz.variable} ${pf.variable} ${l}`}>
        {children}
        <BottomNav locale={l} labels={dict[l].bn} />
      </body>
    </html>
  );
}
