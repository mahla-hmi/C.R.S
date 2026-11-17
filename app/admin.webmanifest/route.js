import { cookies } from 'next/headers';
import { A, LANG_COOKIE, parseLang } from '@/lib/admin/i18n';

// "Install the panel on this phone" manifest: name, language and direction follow the panel language.
export async function GET() {
  const lang = parseLang((await cookies()).get(LANG_COOKIE)?.value), t = A[lang];
  return Response.json({
    name: t.meta.title, short_name: t.meta.short, description: t.meta.desc, lang, dir: lang === 'fa' ? 'rtl' : 'ltr',
    start_url: '/admin', scope: '/admin', display: 'standalone', background_color: '#f5efe6', theme_color: '#1e120c',
    icons: [{ src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } });
}
