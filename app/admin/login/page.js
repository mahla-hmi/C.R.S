import { redirect } from 'next/navigation';
import LoginForm from '@/components/admin/LoginForm';
import { getSession } from '@/lib/admin/server';
import { devHint } from '@/lib/admin/auth';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
  let session = null;
  try { session = await getSession(); } catch { /* show the form anyway */ }
  if (session) redirect('/admin');
  return (
    <main className="ad-login">
      <div className="ad-lcard">
        <div className="ad-logo big">☕</div>
        <h1>ورود به پنل مدیریت</h1>
        <p className="ad-mut">فقط برای مالک و مدیران کافه</p>
        <LoginForm hint={devHint()} />
      </div>
    </main>
  );
}
