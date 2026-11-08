'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERM_LIST, ROLE_LABEL } from '@/lib/admin/permissions';

const ERR = {
  name_short: 'لطفاً نام را کامل بنویسید (دست‌کم ۲ حرف).',
  username_format: 'نام کاربری فقط حروف انگلیسی کوچک، عدد و . _ - باشد (۳ تا ۳۲ نویسه).',
  username_taken: 'این نام کاربری قبلاً استفاده شده است.',
  password_short: 'رمز عبور دست‌کم ۸ نویسه باشد.', password_long: 'رمز عبور بسیار طولانی است.',
  role_invalid: 'نقش معتبر نیست.', perms_invalid: 'دسترسی انتخاب‌شده معتبر نیست.',
  self_forbidden: 'برای جلوگیری از قفل شدن، نقش یا وضعیت حساب خودتان را نمی‌توانید تغییر دهید یا حذفش کنید.',
  not_found: 'این عضو یافت نشد؛ لطفاً صفحه را به‌روزرسانی کنید.', forbidden: 'اجازهٔ انجام این کار را ندارید.', db: 'ثبت تغییر انجام نشد؛ اتصال به پایگاه‌داده را بررسی کنید.',
  generic: 'خطایی رخ داد؛ لطفاً دوباره تلاش کنید.',
};
const when = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' });
const fa = (d) => (d ? when.format(new Date(d)) : null);
// 12 characters without look-alikes (0/O, 1/l/I); crypto-random
const genPassword = () => {
  const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => A[x % A.length]).join('');
};
async function call(method, url, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { window.location.href = '/admin/login'; }
  return { ok: r.ok, j };
}

function MemberForm({ creating = false, member, isMe = false, onDone }) {
  const router = useRouter();
  const [name, setName] = useState(member?.name || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [role, setRole] = useState(member?.role || 'staff');
  const [perms, setPerms] = useState(creating ? ['reservations.view'] : member.perms || []);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setPerms((cur) => {
    let n = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (n.includes('reservations.manage') && !n.includes('reservations.view')) n = [...n, 'reservations.view'];   // manage includes view
    if (!n.includes('reservations.view')) n = n.filter((x) => x !== 'reservations.manage');
    return n;
  });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (creating && !password) return setErr(ERR.password_short);
    setBusy(true);
    const body = { name, role, perms };
    if (creating) body.username = username;
    if (password) body.password = password;
    try {
      const r = await call(creating ? 'POST' : 'PATCH', creating ? '/api/admin/team' : `/api/admin/team/${member.id}`, body);
      if (r.ok) { onDone(); router.refresh(); return; }
      setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(false);
  };
  return (
    <form className="ad-formcard fx" onSubmit={submit}>
      <h3>{creating ? 'افزودن عضو جدید' : `ویرایش ${member.name}`}</h3>
      <div className="ad-grid2">
        <label className="ad-field">نام و نام خانوادگی<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
        {creating
          ? <label className="ad-field">نام کاربری (برای ورود)<input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" placeholder="sara" autoCapitalize="none" autoComplete="off" /></label>
          : <div className="ad-field">نام کاربری<span className="ad-ro" dir="ltr">@{member.username}</span></div>}
      </div>
      <div className="ad-field">
        <label htmlFor={`pw-${member?.id || 'new'}`}>{creating ? 'رمز عبور' : 'رمز عبور جدید (اختیاری)'}</label>
        <span className="ad-pw"><input id={`pw-${member?.id || 'new'}`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="new-password" />
          <button type="button" onClick={() => setShow(!show)}>{show ? 'پنهان' : 'نمایش'}</button></span>
        <span className="ad-gen"><button type="button" className="ad-btn" onClick={() => { setPassword(genPassword()); setShow(true); }}>ساخت رمز تصادفی</button>
          <small>دست‌کم ۸ نویسه. رمز را به همکار خود تحویل دهید؛ پس از ثبت دیگر قابل مشاهده نیست.{!creating && ' با تغییر رمز، نشست‌های باز پیشین این عضو بسته می‌شود.'}</small></span>
      </div>
      <div className="ad-field">نقش
        <div className="ad-seg" role="radiogroup" aria-label="نقش">
          {['staff', 'owner'].map((r) => <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? 'on' : ''} disabled={isMe} onClick={() => setRole(r)}>{ROLE_LABEL[r]}</button>)}
        </div>
        <small className="ad-mut">{role === 'owner' ? 'مالک به همه‌چیز از جمله مدیریت اعضا دسترسی دارد.' : 'کارمند تنها به بخش‌هایی که انتخاب می‌کنید دسترسی دارد.'}</small>
      </div>
      {role === 'staff' && (
        <div className="ad-field">دسترسی‌ها
          <div className="ad-checks">{PERM_LIST.map((p) => (
            <label className="ad-check" key={p.id}><input type="checkbox" checked={perms.includes(p.id)} onChange={() => toggle(p.id)} /><span><b>{p.label}</b><small>{p.hint}</small></span></label>))}</div>
          {perms.length === 0 && <small className="ad-warnline">بدون هیچ دسترسی، این عضو پس از ورود هیچ بخشی را مشاهده نخواهد کرد.</small>}
        </div>
      )}
      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="ad-actions"><button className="ad-btn primary" type="submit" disabled={busy}>{busy ? 'در حال ثبت…' : creating ? 'افزودن عضو' : 'ذخیرهٔ تغییرات'}</button>
        <button className="ad-btn" type="button" onClick={onDone} disabled={busy}>انصراف</button></div>
    </form>
  );
}

function MemberCard({ m, isMe }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (key, method, body) => {
    setBusy(key); setErr('');
    try {
      const r = await call(method, `/api/admin/team/${m.id}`, body);
      if (r.ok) router.refresh(); else setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(''); setAsk('');
  };
  return (
    <>
      <article className={`ad-card ad-mc${m.active ? '' : ' off'}`}>
        <header>
          <span className={`ad-badge ${m.role === 'owner' ? 'warn' : 'mut'}`}>{ROLE_LABEL[m.role]}</span>
          <span className={`ad-badge ${m.active ? 'ok' : 'bad'}`}>{m.active ? 'فعال' : 'غیرفعال'}</span>
        </header>
        <h3 className="ad-name">{m.name}{isMe && <small className="ad-you">شما</small>}</h3>
        <p className="ad-user-id"><bdi dir="ltr">@{m.username}</bdi></p>
        <div className="ad-chips">
          {m.role === 'owner' ? <span className="ad-chip full">دسترسی کامل</span>
            : m.perms.length ? PERM_LIST.filter((p) => m.perms.includes(p.id)).map((p) => <span key={p.id} className="ad-chip">{p.label}</span>)
              : <span className="ad-chip none">بدون دسترسی</span>}
        </div>
        <p className="ad-mut ad-meta2">{fa(m.lastLoginAt) ? `آخرین ورود: ${fa(m.lastLoginAt)}` : 'هنوز وارد نشده'}{m.createdBy ? ` · افزوده‌شده توسط ${m.createdBy}` : ''}</p>
        <footer>
          <div className="ad-actions">
            {ask ? (
              <><span className="ad-sure">{ask === 'delete' ? 'این عضو حذف شود؟' : 'حساب غیرفعال شود؟'}</span>
                <button className="ad-btn bad solid" disabled={!!busy} onClick={() => (ask === 'delete' ? run('del', 'DELETE') : run('active', 'PATCH', { active: false }))}>{busy ? '…' : 'بله'}</button>
                <button className="ad-btn" disabled={!!busy} onClick={() => setAsk('')}>انصراف</button></>
            ) : (
              <><button className="ad-btn" onClick={() => setEdit(!edit)}>{edit ? 'بستن ویرایش' : 'ویرایش'}</button>
                {m.active
                  ? <button className="ad-btn mut" disabled={isMe} title={isMe ? 'حساب خودتان را نمی‌توانید غیرفعال کنید' : ''} onClick={() => setAsk('off')}>غیرفعال‌سازی</button>
                  : <button className="ad-btn ok" disabled={!!busy} onClick={() => run('active', 'PATCH', { active: true })}>{busy ? '…' : 'فعال‌سازی'}</button>}
                <button className="ad-btn bad" disabled={isMe} title={isMe ? 'حساب خودتان را نمی‌توانید حذف کنید' : ''} onClick={() => setAsk('delete')}>حذف</button></>
            )}
          </div>
          {err && <p className="ad-err">{err}</p>}
        </footer>
      </article>
      {edit && <MemberForm member={m} isMe={isMe} onDone={() => setEdit(false)} />}
    </>
  );
}

export default function TeamManager({ members, meId, mePrimary, primaryName }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="ad-team-top">
        <p className="ad-mut">{members.length ? `${members.length.toLocaleString('fa-IR')} عضو (به‌جز حساب اصلی)` : 'هنوز عضوی اضافه نکرده‌اید.'}</p>
        <button className="ad-btn primary" onClick={() => setAdding(!adding)}>{adding ? 'بستن' : '+ افزودن عضو'}</button>
      </div>
      {adding && <MemberForm creating onDone={() => setAdding(false)} />}
      <div className="ad-cards ad-team fx">
        <article className="ad-card ad-mc main">
          <header><span className="ad-badge warn">مالک اصلی</span><span className="ad-badge ok">فعال</span></header>
          <h3 className="ad-name">{primaryName}{mePrimary && <small className="ad-you">شما</small>}</h3>
          <div className="ad-chips"><span className="ad-chip full">دسترسی کامل</span></div>
          <p className="ad-mut ad-meta2">اطلاعات ورود این حساب در تنظیمات سرور (<b dir="ltr">.env.local</b>) است و از اینجا تغییر نمی‌کند. همیشه می‌توانید با آن وارد شوید.</p>
        </article>
        {members.map((m) => <MemberCard key={m.id} m={m} isMe={m.id === meId} />)}
      </div>
    </>
  );
}
