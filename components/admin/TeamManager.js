'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PERM_LIST } from '@/lib/admin/permissions';
import { stampFor } from '@/lib/admin/i18n';
import { useAdmin } from './LangProvider';

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
  const { t, fill } = useAdmin();
  const T = t.team, ERR = T.errors;
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
      <h3>{creating ? T.addTitle : fill(T.editTitle, { name: member.name })}</h3>
      <div className="ad-grid2">
        <label className="ad-field">{T.fullName}<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></label>
        {creating
          ? <label className="ad-field">{T.usernameLogin}<input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" placeholder={T.usernamePh} autoCapitalize="none" autoComplete="off" /></label>
          : <div className="ad-field">{T.username}<span className="ad-ro" dir="ltr">@{member.username}</span></div>}
      </div>
      <div className="ad-field">
        <label htmlFor={`pw-${member?.id || 'new'}`}>{creating ? T.passNew : T.passOpt}</label>
        <span className="ad-pw"><input id={`pw-${member?.id || 'new'}`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" autoComplete="new-password" />
          <button type="button" onClick={() => setShow(!show)}>{show ? T.hide : T.show}</button></span>
        <span className="ad-gen"><button type="button" className="ad-btn" onClick={() => { setPassword(genPassword()); setShow(true); }}>{T.gen}</button>
          <small>{T.passHint}{!creating && T.passHintEdit}</small></span>
      </div>
      <div className="ad-field">{T.role}
        <div className="ad-seg" role="radiogroup" aria-label={T.role}>
          {['staff', 'owner'].map((r) => <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? 'on' : ''} disabled={isMe} onClick={() => setRole(r)}>{t.role[r]}</button>)}
        </div>
        <small className="ad-mut">{role === 'owner' ? T.roleOwnerHint : T.roleStaffHint}</small>
      </div>
      {role === 'staff' && (
        <div className="ad-field">{T.perms}
          <div className="ad-checks">{PERM_LIST.map((p) => (
            <label className="ad-check" key={p.id}><input type="checkbox" checked={perms.includes(p.id)} onChange={() => toggle(p.id)} /><span><b>{t.perm[p.id].label}</b><small>{t.perm[p.id].hint}</small></span></label>))}</div>
          {perms.length === 0 && <small className="ad-warnline">{T.noPerms}</small>}
        </div>
      )}
      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="ad-actions"><button className="ad-btn primary" type="submit" disabled={busy} aria-busy={busy}>{busy ? T.saving : creating ? T.add : t.save}</button>
        <button className="ad-btn" type="button" onClick={onDone} disabled={busy}>{T.cancel}</button></div>
    </form>
  );
}

function MemberCard({ m, isMe }) {
  const router = useRouter();
  const { lang, t, fill } = useAdmin();
  const T = t.team, ERR = T.errors;
  const stamp = stampFor(lang);
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
          <span className={`ad-badge ${m.role === 'owner' ? 'warn' : 'mut'}`}>{t.role[m.role]}</span>
          <span className={`ad-badge ${m.active ? 'ok' : 'bad'}`}>{m.active ? T.active : T.inactive}</span>
        </header>
        <h3 className="ad-name">{m.name}{isMe && <small className="ad-you">{T.you}</small>}</h3>
        <p className="ad-user-id"><bdi dir="ltr">@{m.username}</bdi></p>
        <div className="ad-chips">
          {m.role === 'owner' ? <span className="ad-chip full">{T.fullAccess}</span>
            : m.perms.length ? PERM_LIST.filter((p) => m.perms.includes(p.id)).map((p) => <span key={p.id} className="ad-chip">{t.perm[p.id].label}</span>)
              : <span className="ad-chip none">{T.noAccess}</span>}
        </div>
        <p className="ad-mut ad-meta2">{stamp(m.lastLoginAt) ? fill(T.lastLogin, { v: stamp(m.lastLoginAt) }) : T.neverLogin}{m.createdBy ? fill(T.addedBy, { u: m.createdBy }) : ''}</p>
        <footer>
          <div className="ad-actions">
            {ask ? (
              <><span className="ad-sure">{ask === 'delete' ? T.askDelete : T.askOff}</span>
                <button className="ad-btn bad solid" disabled={!!busy} onClick={() => (ask === 'delete' ? run('del', 'DELETE') : run('active', 'PATCH', { active: false }))}>{busy ? t.busyDots : T.yes}</button>
                <button className="ad-btn" disabled={!!busy} onClick={() => setAsk('')}>{T.cancel}</button></>
            ) : (
              <><button className="ad-btn" onClick={() => setEdit(!edit)}>{edit ? T.closeEdit : T.edit}</button>
                {m.active
                  ? <button className="ad-btn mut" disabled={isMe} title={isMe ? T.noSelfOff : ''} onClick={() => setAsk('off')}>{T.deactivate}</button>
                  : <button className="ad-btn ok" disabled={!!busy} onClick={() => run('active', 'PATCH', { active: true })}>{busy ? t.busyDots : T.activate}</button>}
                <button className="ad-btn bad" disabled={isMe} title={isMe ? T.noSelfDelete : ''} onClick={() => setAsk('delete')}>{T.delete}</button></>
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
  const { t, n, fill } = useAdmin();
  const T = t.team;
  const [adding, setAdding] = useState(false);
  return (
    <>
      <div className="ad-team-top">
        <p className="ad-mut">{members.length ? fill(T.count, { n: n(members.length) }) : T.none}</p>
        <button className="ad-btn primary" onClick={() => setAdding(!adding)}>{adding ? T.closeAdd : T.addBtn}</button>
      </div>
      {adding && <MemberForm creating onDone={() => setAdding(false)} />}
      <div className="ad-cards ad-team fx">
        <article className="ad-card ad-mc main">
          <header><span className="ad-badge warn">{t.role.mainOwner}</span><span className="ad-badge ok">{T.active}</span></header>
          <h3 className="ad-name">{primaryName}{mePrimary && <small className="ad-you">{T.you}</small>}</h3>
          <div className="ad-chips"><span className="ad-chip full">{T.fullAccess}</span></div>
          <p className="ad-mut ad-meta2">{T.mainNote[0]}<b dir="ltr">.env.local</b>{T.mainNote[1]}</p>
        </article>
        {members.map((m) => <MemberCard key={m.id} m={m} isMe={m.id === meId} />)}
      </div>
    </>
  );
}
