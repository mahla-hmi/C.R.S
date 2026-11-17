'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normDigits, parsePrice, parsePercent, BULK_ROUNDS } from '@/lib/admin/menu';
import { stampFor } from '@/lib/admin/i18n';
import { useAdmin } from './LangProvider';

// Owner panel -> Menu. Every change goes to /api/admin/menu/* and the page is refreshed with router.refresh(),
// so what the owner sees is always what is stored (and what guests see on the website).
const group = (n) => new Intl.NumberFormat('en-US').format(n);
async function call(method, url, body) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) window.location.href = '/admin/login';
  return { ok: r.ok, j };
}

// ---- photos: resized in the browser (square, centre crop) so the server only stores small files ----
const toBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif|gif)/.test(file.type) || file.size > 30 * 1024 * 1024) throw new Error('image_type');
  let src;
  try { src = await createImageBitmap(file); } catch {
    src = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => rej(new Error('image_read')); im.src = u; });
  }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  if (!w || !h) throw new Error('image_read');
  const side = Math.min(w, h), sx = (w - side) / 2, sy = (h - side) / 2;
  const draw = (size) => { const s = Math.max(8, Math.min(size, side)), c = document.createElement('canvas'); c.width = c.height = s; c.getContext('2d').drawImage(src, sx, sy, side, side, 0, 0, s, s); return c; };
  const encode = async (c, q) => { let b = await toBlob(c, 'image/webp', q); if (!b || b.type !== 'image/webp') b = await toBlob(c, 'image/jpeg', q); if (!b) throw new Error('image_read'); return b; };
  const big = await encode(draw(960), 0.82), thumbC = draw(360), thumb = await encode(thumbC, 0.8);
  const tiny = draw(20), lqip = tiny.toDataURL('image/webp', 0.4);
  return { big, thumb, lqip, preview: URL.createObjectURL(thumb) };
}
async function uploadImage(p) {
  const f = new FormData();
  f.append('big', p.big, 'big'); f.append('thumb', p.thumb, 'thumb'); f.append('lqip', p.lqip);
  const r = await fetch('/api/admin/menu/images', { method: 'POST', body: f });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) window.location.href = '/admin/login';
  return { ok: r.ok, j };
}
// state of a photo being chosen in a form: { file, preview, removed, busy, err }
function usePhoto() {
  const [p, setP] = useState({ file: null, preview: null, removed: false, busy: false, err: '' });
  const pick = async (f) => {
    if (!f) return;
    setP((s) => ({ ...s, busy: true, err: '' }));
    try { const r = await prepareImage(f); setP({ file: r, preview: r.preview, removed: false, busy: false, err: '' }); }
    catch (e) { setP((s) => ({ ...s, busy: false, err: e?.message === 'image_type' ? 'image_type' : 'image_read' })); }
  };
  const remove = () => setP({ file: null, preview: null, removed: true, busy: false, err: '' });
  return [p, pick, remove];
}
// -> { imageId } to send ({} = unchanged) or { error }
async function resolvePhoto(p) {
  if (p.file) { const u = await uploadImage(p.file); return u.ok ? { imageId: u.j.id } : { error: u.j.error }; }
  return p.removed ? { imageId: null } : {};
}

function PhotoField({ photo: [p, pick, remove], current, fallback }) {
  const { t } = useAdmin();
  const T = t.menu;
  const input = useRef(null);
  const own = !p.removed && current;          // the photo this item/category has now (until the owner removes it)
  const shown = p.preview || own || fallback; // otherwise the category photo is shown, dimmed, as the stand-in
  const dim = !p.preview && !own;
  return (
    <div className="ad-field">{T.photo}
      <div className="am-photo">
        <span className={`am-pic${dim ? ' dim' : ''}`}>{shown ? <img src={shown} alt="" /> : <em>{T.photoNone}</em>}</span>
        <div className="am-photo-acts">
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="ad-btn" disabled={p.busy} aria-busy={p.busy} onClick={() => input.current?.click()}>{p.busy ? T.photoBusy : p.preview || own ? T.photoChange : T.photoPick}</button>
          {(p.preview || own) && <button type="button" className="ad-btn bad" disabled={p.busy} onClick={remove}>{T.photoRemove}</button>}
        </div>
      </div>
      {p.preview ? <small className="ad-mut">{T.photoReady}</small> : <small className="ad-mut">{T.photoHint}{fallback ? ` ${T.photoFromCat}` : ''}</small>}
      {p.err && <p className="ad-err" role="alert">{T.errors[p.err]}</p>}
    </div>
  );
}

// ---- category: create / edit ----
function CategoryForm({ cat, onDone }) {
  const router = useRouter();
  const { t } = useAdmin();
  const T = t.menu, ERR = T.errors, creating = !cat;
  const [fa, setFa] = useState(cat?.fa || '');
  const [en, setEn] = useState(cat?.en || '');
  const [visible, setVisible] = useState(cat ? cat.visible : true);
  const photo = usePhoto();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const ph = await resolvePhoto(photo[0]);
      if (ph.error) { setErr(ERR[ph.error] || ERR.generic); setBusy(false); return; }
      const body = { fa, en, ...ph };
      if (!creating) body.visible = visible;
      const r = await call(creating ? 'POST' : 'PATCH', creating ? '/api/admin/menu/categories' : `/api/admin/menu/categories/${cat.id}`, body);
      if (r.ok) { onDone(); router.refresh(); return; }
      setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setErr('');
    try { const r = await call('DELETE', `/api/admin/menu/categories/${cat.id}`); if (r.ok) { onDone(); router.refresh(); return; } setErr(ERR[r.j.error] || ERR.generic); } catch { setErr(ERR.db); }
    setBusy(false); setAsk(false);
  };
  return (
    <form className="ad-formcard am-form fx" onSubmit={submit}>
      <h3>{creating ? T.catNew : T.catEdit}</h3>
      <div className="ad-grid2">
        <label className="ad-field">{T.nameFa}<input value={fa} onChange={(e) => setFa(e.target.value)} maxLength={40} autoComplete="off" /></label>
        <label className="ad-field">{T.nameEn}<input value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" maxLength={40} autoComplete="off" /></label>
      </div>
      <PhotoField photo={photo} current={cat?.own ? cat.thumb : null} fallback={cat && !cat.own ? cat.thumb : null} />
      {!creating && <label className="ad-check"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /><span><b>{T.visible}</b></span></label>}
      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="ad-actions">
        <button className="ad-btn primary" type="submit" disabled={busy || photo[0].busy} aria-busy={busy}>{busy ? T.saving : creating ? T.create : T.save}</button>
        <button className="ad-btn" type="button" onClick={onDone} disabled={busy}>{T.cancel}</button>
        {!creating && (ask
          ? <><span className="ad-sure">{T.askDeleteCat}</span><button type="button" className="ad-btn bad solid" disabled={busy} onClick={remove}>{T.yes}</button><button type="button" className="ad-btn" onClick={() => setAsk(false)}>{T.cancel}</button></>
          : <button type="button" className="ad-btn bad am-push" disabled={busy || cat.items.length > 0} title={cat.items.length ? T.delCatBlocked : ''} onClick={() => setAsk(true)}>{T.del}</button>)}
      </div>
      {!creating && cat.items.length > 0 && <small className="ad-mut">{T.delCatBlocked}</small>}
    </form>
  );
}

// ---- item: full edit form (name, English name, price, category, availability, photo, delete) ----
function ItemForm({ item, cat, cats, onDone }) {
  const router = useRouter();
  const { t } = useAdmin();
  const T = t.menu, ERR = T.errors;
  const [fa, setFa] = useState(item.fa);
  const [en, setEn] = useState(item.en);
  const [price, setPrice] = useState(group(item.price));
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [available, setAvailable] = useState(item.available);
  const photo = usePhoto();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (parsePrice(price) === null) return setErr(ERR.price_invalid);
    setBusy(true);
    try {
      const ph = await resolvePhoto(photo[0]);
      if (ph.error) { setErr(ERR[ph.error] || ERR.generic); setBusy(false); return; }
      const r = await call('PATCH', `/api/admin/menu/items/${item.id}`, { fa, en, price, categoryId, available, ...ph });
      if (r.ok) { onDone(); router.refresh(); return; }
      setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(false);
  };
  const remove = async () => {
    setBusy(true); setErr('');
    try { const r = await call('DELETE', `/api/admin/menu/items/${item.id}`); if (r.ok) { onDone(); router.refresh(); return; } setErr(ERR[r.j.error] || ERR.generic); } catch { setErr(ERR.db); }
    setBusy(false); setAsk(false);
  };
  return (
    <form className="ad-formcard am-form fx" onSubmit={submit}>
      <h3>{T.editItem}</h3>
      <div className="ad-grid2">
        <label className="ad-field">{T.nameFa}<input value={fa} onChange={(e) => setFa(e.target.value)} maxLength={60} autoComplete="off" /></label>
        <label className="ad-field">{T.nameEn}<input value={en} onChange={(e) => setEn(e.target.value)} dir="ltr" maxLength={60} autoComplete="off" /></label>
        <label className="ad-field">{T.price}<input value={price} inputMode="numeric" dir="ltr" autoComplete="off"
          onChange={(e) => { const d = normDigits(e.target.value).replace(/\D/g, '').slice(0, 9); setPrice(d ? group(Number(d)) : ''); }} /></label>
        <label className="ad-field">{T.cat}<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{cats.map((c) => <option key={c.id} value={c.id}>{c.fa}</option>)}</select></label>
      </div>
      <PhotoField photo={photo} current={item.thumb} fallback={cat.thumb} />
      <label className="ad-check"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span><b>{T.avail}</b><small>{T.availHint}</small></span></label>
      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="ad-actions">
        <button className="ad-btn primary" type="submit" disabled={busy || photo[0].busy} aria-busy={busy}>{busy ? T.saving : T.save}</button>
        <button className="ad-btn" type="button" onClick={onDone} disabled={busy}>{T.cancel}</button>
        {ask
          ? <><span className="ad-sure">{T.askDeleteItem}</span><button type="button" className="ad-btn bad solid" disabled={busy} onClick={remove}>{T.yes}</button><button type="button" className="ad-btn" onClick={() => setAsk(false)}>{T.cancel}</button></>
          : <button type="button" className="ad-btn bad am-push" disabled={busy} onClick={() => setAsk(true)}>{T.del}</button>}
      </div>
    </form>
  );
}

// ---- item row: quick price change, availability switch, reorder, edit ----
function ItemRow({ item, cat, cats, first, last, canMove }) {
  const router = useRouter();
  const { t, lang } = useAdmin();
  const T = t.menu, ERR = T.errors;
  const [edit, setEdit] = useState(false);
  const [price, setPrice] = useState(group(item.price));
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const parsed = parsePrice(price);
  const dirty = parsed !== item.price;
  const run = async (key, body, after) => {
    setBusy(key); setErr('');
    try {
      const r = await call('PATCH', `/api/admin/menu/items/${item.id}`, body);
      if (r.ok) { after?.(); router.refresh(); } else setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy('');
  };
  const savePrice = () => {
    if (parsed === null) return setErr(ERR.price_invalid);
    run('price', { price: parsed }, () => { setFlash(true); clearTimeout(timer.current); timer.current = setTimeout(() => setFlash(false), 1800); });
  };
  const pic = item.thumb || cat.thumb;
  const money = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(item.price);
  return (
    <li className={`am-item${item.available ? '' : ' off'}`}>
      <div className="am-row">
        <button type="button" className={`am-pic sm${item.thumb ? '' : ' dim'}`} onClick={() => setEdit(!edit)} aria-label={`${T.edit}: ${item.fa}`}>{pic ? <img src={pic} alt="" loading="lazy" /> : <em>{T.photoNone}</em>}</button>
        <div className="am-name"><b>{item.fa}</b>{item.en && <small>{item.en}</small>}{!item.available && <span className="ad-badge mut">{T.unavailBadge}</span>}</div>
        <div className="am-price" title={money}>
          <input value={price} inputMode="numeric" dir="ltr" aria-label={fillName(T.priceAria, item.fa)} autoComplete="off"
            onChange={(e) => { const d = normDigits(e.target.value).replace(/\D/g, '').slice(0, 9); setPrice(d ? group(Number(d)) : ''); setErr(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) { e.preventDefault(); savePrice(); } if (e.key === 'Escape') setPrice(group(item.price)); }} />
          <small>{T.toman}</small>
          {dirty && <>
            <button type="button" className="ad-btn ok am-ico" disabled={!!busy} aria-busy={busy === 'price'} onClick={savePrice} title={T.priceSave} aria-label={T.priceSave}>✓</button>
            <button type="button" className="ad-btn am-ico" disabled={!!busy} onClick={() => { setPrice(group(item.price)); setErr(''); }} title={T.priceUndo} aria-label={T.priceUndo}>×</button>
          </>}
          {flash && !dirty && <span className="am-flash" role="status">{T.saved}</span>}
        </div>
        <div className="am-acts">
          <button type="button" role="switch" aria-checked={item.available} aria-label={fillName(T.availAria, item.fa)} title={item.available ? T.avail : T.unavail}
            className={`am-sw${item.available ? ' on' : ''}`} disabled={!!busy} onClick={() => run('avail', { available: !item.available })}><i /></button>
          {canMove && <span className="am-mv">
            <button type="button" className="ad-btn am-ico" disabled={first || !!busy} onClick={() => run('mv', { move: 'up' })} title={T.up} aria-label={T.up}>▲</button>
            <button type="button" className="ad-btn am-ico" disabled={last || !!busy} onClick={() => run('mv', { move: 'down' })} title={T.down} aria-label={T.down}>▼</button>
          </span>}
          <button type="button" className="ad-btn" onClick={() => setEdit(!edit)}>{edit ? T.closeEdit : T.edit}</button>
        </div>
      </div>
      {err && <p className="ad-err" role="alert">{err}</p>}
      {edit && <ItemForm item={item} cat={cat} cats={cats} onDone={() => setEdit(false)} />}
    </li>
  );
}
const fillName = (s, name) => String(s).replace('{name}', name);

// ---- add an item at the bottom of a category ----
function AddItem({ cat }) {
  const router = useRouter();
  const { t } = useAdmin();
  const T = t.menu, ERR = T.errors;
  const [fa, setFa] = useState('');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!fa.trim()) return setErr(ERR.name_required);
    if (parsePrice(price) === null) return setErr(ERR.price_invalid);
    setBusy(true);
    try {
      const r = await call('POST', '/api/admin/menu/items', { categoryId: cat.id, fa, price });
      if (r.ok) { setFa(''); setPrice(''); router.refresh(); } else setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(false);
  };
  return (
    <form className="am-add" onSubmit={submit} aria-label={T.addItem}>
      <input value={fa} onChange={(e) => setFa(e.target.value)} placeholder={T.itemNamePh} maxLength={60} autoComplete="off" aria-label={T.itemNamePh} />
      <input value={price} inputMode="numeric" dir="ltr" placeholder={T.pricePh} autoComplete="off" aria-label={T.pricePh}
        onChange={(e) => { const d = normDigits(e.target.value).replace(/\D/g, '').slice(0, 9); setPrice(d ? group(Number(d)) : ''); }} />
      <button className="ad-btn primary" type="submit" disabled={busy} aria-busy={busy}>{T.addItemBtn}</button>
      {err && <p className="ad-err" role="alert">{err}</p>}
    </form>
  );
}

// ---- one category: header + items ----
function CategoryCard({ cat, cats, idx, open, searching, toggle, items }) {
  const router = useRouter();
  const { t, n, fill } = useAdmin();
  const T = t.menu;
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const move = async (dir) => { setBusy(true); try { await call('PATCH', `/api/admin/menu/categories/${cat.id}`, { move: dir }); router.refresh(); } catch {} setBusy(false); };
  const shown = open || searching;
  return (
    <section className={`am-cat${cat.visible ? '' : ' off'}`} id={`cat-${cat.id}`}>
      <header className="am-cat-h">
        <button type="button" className="am-pic" onClick={() => setEdit(!edit)} aria-label={`${T.catEdit}: ${cat.fa}`}>{cat.thumb ? <img src={cat.thumb} alt="" loading="lazy" /> : <em>{T.photoNone}</em>}</button>
        <button type="button" className="am-cat-t" onClick={toggle} aria-expanded={shown}>
          <b>{cat.fa}</b>{cat.en && <small>{cat.en}</small>}
          <span className="am-meta"><span>{fill(T.itemsCount, { n: n(cat.items.length) })}</span>{!cat.visible && <span className="ad-badge warn">{T.hiddenCat}</span>}</span>
        </button>
        <div className="am-acts">
          {!searching && <span className="am-mv">
            <button type="button" className="ad-btn am-ico" disabled={busy || idx === 0} onClick={() => move('up')} title={T.up} aria-label={T.up}>▲</button>
            <button type="button" className="ad-btn am-ico" disabled={busy || idx === cats.length - 1} onClick={() => move('down')} title={T.down} aria-label={T.down}>▼</button>
          </span>}
          <button type="button" className="ad-btn" onClick={() => setEdit(!edit)}>{edit ? T.closeEdit : T.catEdit}</button>
          <button type="button" className={`am-chev${shown ? ' open' : ''}`} onClick={toggle} aria-label={shown ? T.close : T.open} aria-expanded={shown}><i /></button>
        </div>
      </header>
      {edit && <CategoryForm cat={cat} onDone={() => setEdit(false)} />}
      {shown && (
        <div className="am-body fx">
          {items.length
            ? <ul className="am-list">{items.map((it) => {
              const k = cat.items.indexOf(it);
              return <ItemRow key={`${it.id}:${it.fa}:${it.en}:${it.price}:${it.available}:${it.thumb || ''}:${it.categoryId}`} item={it} cat={cat} cats={cats} first={k === 0} last={k === cat.items.length - 1} canMove={!searching} />;
            })}</ul>
            : <p className="ad-mut am-empty">{cat.items.length ? T.noMatch : T.noItems}</p>}
          {!searching && <AddItem cat={cat} />}
        </div>
      )}
    </section>
  );
}

// ---- bulk price change (owners only): raise or lower every price by a percentage, with preview and undo ----
function BulkPanel({ menu, last, onClose }) {
  const router = useRouter();
  const { lang, t, n, fill } = useAdmin();
  const T = t.menu, B = T.bulk, ERR = T.errors;
  const money = useMemo(() => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US'), [lang]);
  const [dir, setDir] = useState('up');
  const [percent, setPercent] = useState('');
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState(() => new Set());
  const [round, setRound] = useState(1000);
  const [prev, setPrev] = useState(null);   // preview result
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const reset = () => { setPrev(null); setAsk(false); setErr(''); setMsg(''); }; // any change of the inputs invalidates the preview
  const body = (mode) => ({ mode, direction: dir, percent, round, scope: all ? 'all' : [...picked] });
  const valid = parsePercent(percent) !== null;
  const send = async (mode) => {
    if (!valid) return setErr(ERR.percent_invalid);
    if (!all && !picked.size) return setErr(ERR.scope_empty);
    setBusy(mode); setErr(''); setMsg('');
    try {
      const r = await call('POST', '/api/admin/menu/bulk', body(mode));
      if (!r.ok) setErr(ERR[r.j.error] || ERR.generic);
      else if (mode === 'preview') { setPrev(r.j); setAsk(false); }
      else { setMsg(fill(B.done, { n: n(r.j.changed) })); setPrev(null); setAsk(false); router.refresh(); }
    } catch { setErr(ERR.db); }
    setBusy('');
  };
  return (
    <div className="ad-formcard am-form am-bulk fx">
      <h3>{B.title}</h3>
      <p className="ad-mut">{B.intro}</p>
      <LastBulk last={last} />
      <div className="ad-field">{B.percent}
        <div className="am-bulk-row">
          <div className="ad-seg" role="radiogroup" aria-label={B.title}>
            {['up', 'down'].map((d) => <button key={d} type="button" role="radio" aria-checked={dir === d} className={dir === d ? 'on' : ''} onClick={() => { setDir(d); reset(); }}>{B[d]}</button>)}
          </div>
          <span className="am-pct"><input value={percent} inputMode="decimal" dir="ltr" placeholder={B.percentPh} autoComplete="off" aria-label={B.percent}
            onChange={(e) => { setPercent(normDigits(e.target.value).replace(/[^\d.,\u066B]/g, '').slice(0, 6)); reset(); }} /><b>%</b></span>
        </div>
      </div>
      <div className="ad-grid2">
        <div className="ad-field">{B.scope}
          <div className="ad-seg" role="radiogroup" aria-label={B.scope}>
            <button type="button" role="radio" aria-checked={all} className={all ? 'on' : ''} onClick={() => { setAll(true); reset(); }}>{B.scopeAll}</button>
            <button type="button" role="radio" aria-checked={!all} className={!all ? 'on' : ''} onClick={() => { setAll(false); reset(); }}>{B.scopeSome}</button>
          </div>
        </div>
        <label className="ad-field">{B.round}
          <select value={round} onChange={(e) => { setRound(Number(e.target.value)); reset(); }}>{BULK_ROUNDS.map((r) => <option key={r} value={r}>{B[`round${r}`]}</option>)}</select>
        </label>
      </div>
      {!all && (
        <div className="ad-checks am-scope">{menu.map((c) => (
          <label className="ad-check" key={c.id}><input type="checkbox" checked={picked.has(c.id)} onChange={() => { setPicked((cur) => { const nx = new Set(cur); if (nx.has(c.id)) nx.delete(c.id); else nx.add(c.id); return nx; }); reset(); }} />
            <span><b>{c.fa}</b><small>{fill(T.itemsCount, { n: n(c.items.length) })}</small></span></label>))}</div>
      )}
      {prev && (
        <div className="am-prev" role="status">
          <b>{prev.changed ? fill(B.result, { changed: n(prev.changed), total: n(prev.total) }) : B.resultNone}</b>
          {prev.sample.length > 0 && <>
            <small className="ad-mut">{B.sample}</small>
            <ul>{prev.sample.map((x, i) => <li key={i}><span>{x.cat} · {x.fa}</span><span className={`am-delta ${dir}`}><s>{money.format(x.from)}</s> → <b>{money.format(x.to)}</b></span></li>)}</ul>
          </>}
        </div>
      )}
      {msg && <p className="am-ok" role="status">{msg}</p>}
      {err && <p className="ad-err" role="alert">{err}</p>}
      <div className="ad-actions">
        {prev?.changed > 0 && (ask
          ? <><span className="ad-sure">{fill(B.askApply, { changed: n(prev.changed) })}</span>
            <button type="button" className="ad-btn primary" disabled={!!busy} aria-busy={busy === 'apply'} onClick={() => send('apply')}>{busy === 'apply' ? B.applying : B.apply}</button>
            <button type="button" className="ad-btn" disabled={!!busy} onClick={() => setAsk(false)}>{T.cancel}</button></>
          : <button type="button" className="ad-btn primary" onClick={() => setAsk(true)}>{B.apply}</button>)}
        {!ask && <button type="button" className="ad-btn" disabled={!!busy} aria-busy={busy === 'preview'} onClick={() => send('preview')}>{busy === 'preview' ? B.previewing : B.preview}</button>}
        <button type="button" className="ad-btn" onClick={onClose} disabled={!!busy}>{T.closeEdit}</button>
      </div>
    </div>
  );
}

// "last bulk change" line with its undo button
function LastBulk({ last }) {
  const router = useRouter();
  const { lang, t, n, fill } = useAdmin();
  const B = t.menu.bulk, ERR = t.menu.errors;
  const stamp = stampFor(lang);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const undo = async () => {
    setBusy(true); setErr('');
    try {
      const r = await call('POST', '/api/admin/menu/bulk/undo');
      if (r.ok) { setMsg(fill(B.undone, { n: n(r.j.reverted) }) + (r.j.skipped ? fill(B.undoneSkip, { s: n(r.j.skipped) }) : '')); router.refresh(); }
      else setErr(ERR[r.j.error] || ERR.generic);
    } catch { setErr(ERR.db); }
    setBusy(false); setAsk(false);
  };
  if (!last && !msg) return null;
  const pct = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(last?.percent || 0);
  return (
    <div className="am-last">
      {last && <span>{fill(B.last, { what: fill(last.direction === 'up' ? B.lastUp : B.lastDown, { p: pct }), n: n(last.count), when: stamp(last.at) })}</span>}
      {last && (ask
        ? <><span className="ad-sure">{B.askUndo}</span>
          <button type="button" className="ad-btn bad solid" disabled={busy} aria-busy={busy} onClick={undo}>{busy ? B.undoing : B.undo}</button>
          <button type="button" className="ad-btn" disabled={busy} onClick={() => setAsk(false)}>{t.menu.cancel}</button></>
        : <button type="button" className="ad-btn" onClick={() => setAsk(true)}>{B.undo}</button>)}
      {msg && <span className="am-ok" role="status">{msg}</span>}
      {err && <span className="ad-err" role="alert">{err}</span>}
    </div>
  );
}

export default function MenuManager({ menu, isOwner = false, last = null }) {
  const { t, n, fill } = useAdmin();
  const T = t.menu;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set(menu[0] ? [menu[0].id] : []));
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  const total = useMemo(() => menu.reduce((s, c) => s + c.items.length, 0), [menu]);
  const s = q.trim().toLowerCase();
  const view = useMemo(() => menu.map((c) => {
    if (!s) return { c, items: c.items };
    const all = c.fa.toLowerCase().includes(s) || (c.en || '').toLowerCase().includes(s);
    return { c, items: all ? c.items : c.items.filter((i) => i.fa.toLowerCase().includes(s) || i.en.toLowerCase().includes(s)) };
  }).filter((x) => !s || x.items.length), [menu, s]);
  const toggle = (id) => setOpen((cur) => { const nx = new Set(cur); if (nx.has(id)) nx.delete(id); else nx.add(id); return nx; });
  return (
    <>
      <div className="am-top">
        <div className="am-search">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.searchPh} aria-label={T.searchAria} autoComplete="off" />
        </div>
        <p className="ad-mut am-sum">{fill(T.summary, { c: n(menu.length), i: n(total) })}</p>
        {isOwner && <button className="ad-btn am-bulkbtn" onClick={() => setBulk(!bulk)} aria-expanded={bulk}>% {T.bulk.btn}</button>}
        <button className="ad-btn primary am-addcat" onClick={() => setAdding(!adding)}>{adding ? T.closeAdd : T.addCat}</button>
      </div>
      {isOwner && bulk && <BulkPanel menu={menu} last={last} onClose={() => setBulk(false)} />}
      {isOwner && !bulk && last && <LastBulk last={last} />}
      {adding && <CategoryForm onDone={() => setAdding(false)} />}
      <div className="am-cats">
        {view.map(({ c, items }) => <CategoryCard key={c.id} cat={c} cats={menu} idx={menu.indexOf(c)} open={open.has(c.id)} searching={!!s} toggle={() => toggle(c.id)} items={items} />)}
        {!view.length && <div className="ad-empty"><b>{s ? T.noMatch : T.emptyMenu}</b></div>}
      </div>
    </>
  );
}
