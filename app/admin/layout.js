import { Vazirmatn } from 'next/font/google';
import './admin.css';
import { getLang } from '@/lib/admin/lang';
import { A } from '@/lib/admin/i18n';
import { LangProvider } from '@/components/admin/LangProvider';
import RippleFx from '@/components/admin/RippleFx';
const vz = Vazirmatn({ subsets: ['arabic', 'latin'], variable: '--vz' });

// the tab title and the "install on phone" name follow the panel language
export async function generateMetadata() {
  const t = A[await getLang()];
  return {
    title: t.meta.title, robots: { index: false, follow: false }, // keep it out of search engines
    manifest: '/admin.webmanifest', // lets the owner install the panel on the phone (needed for notifications on iPhone)
    icons: { icon: '/admin-icon-192.png', apple: '/admin-icon-192.png' },
    appleWebApp: { capable: true, title: t.meta.short, statusBarStyle: 'black-translucent' },
  };
}
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1e120c' };
export default async function AdminRoot({ children }) {
  const lang = await getLang();
  return (<html lang={lang} dir={lang === 'fa' ? 'rtl' : 'ltr'}><body className={vz.variable}><LangProvider lang={lang}><RippleFx />{children}</LangProvider></body></html>);
}
