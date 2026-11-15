import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import LangSwitch from '@/components/admin/LangSwitch';
import { getSession } from '@/lib/admin/server';
import { adminI18n } from '@/lib/admin/lang';
import { devHint } from '@/lib/admin/auth';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  const { t } = await adminI18n();
  let session = null;
  try { session = await getSession(); } catch { /* show the form anyway */ }
  if (session) redirect('/admin');
  return (
    <main className="ad-login">
      <div className="ad-lcard">
        <div className="ad-lang-corner"><LangSwitch /></div>
        <div className="ad-logo big">☕</div>
        <h1>{t.login.title}</h1>
        <p className="ad-mut">{t.login.sub}</p>
        <LoginForm hint={devHint()} />
      </div>
    </main>
  );
}
