import { Vazirmatn } from 'next/font/google';
import './admin.css';
const vz = Vazirmatn({ subsets: ['arabic', 'latin'], variable: '--vz' });
export const metadata = {
  title: 'پنل مدیریت کافه', robots: { index: false, follow: false }, // keep it out of search engines
  manifest: '/admin.webmanifest', // lets the owner install the panel on the phone (needed for notifications on iPhone)
  icons: { icon: '/admin-icon-192.png', apple: '/admin-icon-192.png' },
  appleWebApp: { capable: true, title: 'پنل کافه', statusBarStyle: 'black-translucent' },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1e120c' };
export default function AdminRoot({ children }) {
  return (<html lang="fa" dir="rtl"><body className={vz.variable}>{children}</body></html>);
}
