// Menu operations for the owner panel, on the collections `menu_categories`, `menu_items` and `menu_images`.
// Every function takes the database and returns { status, body } so the API routes stay thin and this file can be tested with an in-memory database.
// The PUBLIC menu (lib/data.js getMenu) reads the same collections, so every change here shows on the website immediately.
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { validateItem, validateCategory, validateBulk, newPrice, sniffImage, validLqip, IMG_MAX_BIG, IMG_MAX_THUMB } from './menu';

const fail = (status, error, field) => ({ status, body: { error, ...(field ? { field } : {}) } });
const ok = (extra = {}) => ({ status: 200, body: { ok: true, ...extra } });
const col = (d) => ({ cats: d.collection('menu_categories'), items: d.collection('menu_items'), imgs: d.collection('menu_images') });
// item ids are MongoDB ObjectIds (the first-start seed did not set its own ids)
const toOid = (id) => (/^[0-9a-f]{24}$/i.test(String(id)) ? new ObjectId(String(id)) : null);
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a._id).localeCompare(String(b._id));

const pubImage = (im) => (im?.id ? { id: im.id, lqip: im.lqip || null } : null);
const pubItem = (x) => ({ id: String(x._id), categoryId: x.categoryId, fa: x.name?.fa || '', en: x.name?.en || '', price: x.price, available: x.available !== false, image: pubImage(x.image) });
const pubCat = (c, items) => ({ id: c._id, fa: c.fa, en: c.en || '', visible: c.visible !== false, image: pubImage(c.image), items });

// everything the owner sees: hidden categories and unavailable items included
export async function getMenuAdmin(d) {
  const { cats, items } = col(d);
  const [cs, is] = await Promise.all([cats.find({}).toArray(), items.find({}).toArray()]);
  const by = new Map();
  for (const x of is.sort(byOrder)) (by.get(x.categoryId) || by.set(x.categoryId, []).get(x.categoryId)).push(pubItem(x));
  return cs.sort(byOrder).map((c) => pubCat(c, by.get(c._id) || []));
}

// ---- photos ----
// A photo is stored twice (big for banners, small for thumbnails). Until it is attached to an item or category it is "unused"
// and a TTL index (migration 006) removes it after a day, so abandoned uploads do not pile up.
export async function saveImage(d, { big, thumb, lqip }) {
  const typeBig = sniffImage(big), typeThumb = sniffImage(thumb);
  if (!typeBig || !typeThumb) return fail(400, 'image_type');
  if (big.length > IMG_MAX_BIG || thumb.length > IMG_MAX_THUMB) return fail(413, 'image_big');
  if (!validLqip(lqip)) return fail(400, 'image_invalid');
  const id = randomUUID();
  await col(d).imgs.insertOne({ _id: id, data: big, thumb, type: typeBig, thumbType: typeThumb, lqip, used: false, createdAt: new Date() });
  return ok({ id, lqip });
}
async function attach(d, id) { // -> { id, lqip } or null when the photo does not exist
  const im = await col(d).imgs.findOne({ _id: id });
  if (!im) return null;
  await col(d).imgs.updateOne({ _id: id }, { $set: { used: true } });
  return { id, lqip: im.lqip || null };
}
async function release(d, id) { // a photo nobody uses any more is deleted
  if (!id) return;
  const { cats, items, imgs } = col(d);
  if ((await items.countDocuments({ 'image.id': id })) + (await cats.countDocuments({ 'image.id': id })) === 0) await imgs.deleteOne({ _id: id });
}

// ---- ordering helpers ----
async function nextItemOrder(d, categoryId) {
  const rows = await col(d).items.find({ categoryId }).toArray();
  return rows.reduce((m, r) => Math.max(m, (r.order ?? 0) + 1), 0);
}
async function renumber(coll, rows) { // rows in their new sequence -> order 0..n-1 (only changed rows are written)
  for (let i = 0; i < rows.length; i++) if (rows[i].order !== i) await coll.updateOne({ _id: rows[i]._id }, { $set: { order: i } });
}
async function swap(coll, rows, id, dir) {
  const i = rows.findIndex((r) => String(r._id) === String(id)), j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return false;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await renumber(coll, rows);
  return true;
}

// ---- categories ----
export async function createCategory(d, body) {
  const v = validateCategory(body, { creating: true });
  if (v.error) return fail(400, v.error, v.field);
  const { cats } = col(d), x = v.value;
  const rows = await cats.find({}).toArray();
  const doc = { _id: `c${randomUUID().slice(0, 8)}`, fa: x.fa, order: rows.reduce((m, r) => Math.max(m, (r.order ?? 0) + 1), 0), visible: true };
  if (x.en) doc.en = x.en;
  if (x.imageId) { const im = await attach(d, x.imageId); if (!im) return fail(400, 'image_invalid', 'image'); doc.image = im; }
  await cats.insertOne(doc);
  return ok({ id: doc._id });
}

export async function updateCategory(d, id, body) {
  if (body?.move === 'up' || body?.move === 'down') {
    const { cats } = col(d);
    const rows = (await cats.find({}).toArray()).sort(byOrder);
    return (await swap(cats, rows, id, body.move)) ? ok() : fail(404, 'not_found');
  }
  const v = validateCategory(body, { creating: false });
  if (v.error) return fail(400, v.error, v.field);
  const { cats } = col(d), x = v.value;
  const prev = await cats.findOne({ _id: String(id) });
  if (!prev) return fail(404, 'not_found');
  const set = {}, unset = {};
  if (x.fa !== undefined) set.fa = x.fa;
  if ('en' in x) { if (x.en) set.en = x.en; else unset.en = ''; }
  if (x.visible !== undefined) set.visible = x.visible;
  if ('imageId' in x) {
    if (x.imageId === null) unset.image = '';
    else { const im = await attach(d, x.imageId); if (!im) return fail(400, 'image_invalid', 'image'); set.image = im; }
  }
  const upd = {};
  if (Object.keys(set).length) upd.$set = set;
  if (Object.keys(unset).length) upd.$unset = unset;
  if (Object.keys(upd).length) await cats.updateOne({ _id: prev._id }, upd);
  if ('imageId' in x && prev.image?.id !== x.imageId) await release(d, prev.image?.id);
  return ok();
}

export async function deleteCategory(d, id) {
  const { cats, items } = col(d);
  const prev = await cats.findOne({ _id: String(id) });
  if (!prev) return fail(404, 'not_found');
  if ((await items.countDocuments({ categoryId: prev._id })) > 0) return fail(409, 'category_not_empty'); // never silently delete dishes
  await cats.deleteOne({ _id: prev._id });
  await release(d, prev.image?.id);
  return ok();
}

// ---- items ----
export async function createItem(d, body) {
  const v = validateItem(body, { creating: true });
  if (v.error) return fail(400, v.error, v.field);
  const { cats, items } = col(d), x = v.value;
  if (!(await cats.findOne({ _id: x.categoryId }))) return fail(400, 'category_invalid', 'categoryId');
  const doc = { categoryId: x.categoryId, name: { fa: x.fa }, price: x.price, order: await nextItemOrder(d, x.categoryId), available: x.available !== false };
  if (x.en) doc.name.en = x.en;
  if (x.imageId) { const im = await attach(d, x.imageId); if (!im) return fail(400, 'image_invalid', 'image'); doc.image = im; }
  try { await items.insertOne(doc); } catch (e) { if (e?.code === 11000) return fail(409, 'name_taken', 'fa'); throw e; } // unique: same name twice in one category
  return ok({ id: String(doc._id) });
}

export async function updateItem(d, id, body) {
  const _id = toOid(id);
  if (!_id) return fail(404, 'not_found');
  const { cats, items } = col(d);
  if (body?.move === 'up' || body?.move === 'down') {
    const prev = await items.findOne({ _id });
    if (!prev) return fail(404, 'not_found');
    const rows = (await items.find({ categoryId: prev.categoryId }).toArray()).sort(byOrder);
    return (await swap(items, rows, _id, body.move)) ? ok() : ok(); // already first/last: nothing to do
  }
  const v = validateItem(body, { creating: false });
  if (v.error) return fail(400, v.error, v.field);
  const x = v.value;
  const prev = await items.findOne({ _id });
  if (!prev) return fail(404, 'not_found');
  const set = {}, unset = {};
  if (x.fa !== undefined) set['name.fa'] = x.fa;
  if ('en' in x) { if (x.en) set['name.en'] = x.en; else unset['name.en'] = ''; }
  if (x.price !== undefined) set.price = x.price;
  if (x.available !== undefined) set.available = x.available;
  if (x.categoryId && x.categoryId !== prev.categoryId) { // move to another category (goes to its end)
    if (!(await cats.findOne({ _id: x.categoryId }))) return fail(400, 'category_invalid', 'categoryId');
    set.categoryId = x.categoryId;
    set.order = await nextItemOrder(d, x.categoryId);
  }
  if ('imageId' in x) {
    if (x.imageId === null) unset.image = '';
    else { const im = await attach(d, x.imageId); if (!im) return fail(400, 'image_invalid', 'image'); set.image = im; }
  }
  const upd = {};
  if (Object.keys(set).length) upd.$set = set;
  if (Object.keys(unset).length) upd.$unset = unset;
  if (Object.keys(upd).length) {
    try { await items.updateOne({ _id }, upd); } catch (e) { if (e?.code === 11000) return fail(409, 'name_taken', 'fa'); throw e; }
  }
  if ('imageId' in x && prev.image?.id !== x.imageId) await release(d, prev.image?.id);
  return ok();
}

export async function deleteItem(d, id) {
  const _id = toOid(id);
  if (!_id) return fail(404, 'not_found');
  const { items } = col(d);
  const prev = await items.findOne({ _id });
  if (!prev) return fail(404, 'not_found');
  await items.deleteOne({ _id });
  await release(d, prev.image?.id);
  return ok();
}

// ---- bulk price change (owner only) ----
// preview: nothing is written, the owner sees how many prices change and a few examples.
// apply: every item in scope (hidden and unavailable ones too) gets its new price, and the old prices are kept as ONE undo record
// (collection menu_price_changes, _id "last"). Undo only restores items that still have the price the bulk change gave them,
// so a price the owner edited by hand afterwards is never overwritten.
const MAX_BULK_ITEMS = 5000;
async function planBulk(d, body) {
  const v = validateBulk(body);
  if (v.error) return { fail: fail(400, v.error, v.field) };
  const x = v.value, { cats, items } = col(d);
  const allCats = (await cats.find({}).toArray()).sort(byOrder);
  const scope = x.categoryIds ? allCats.filter((c) => x.categoryIds.includes(c._id)) : allCats;
  if (!scope.length) return { fail: fail(400, 'scope_empty', 'scope') };
  const ids = new Set(scope.map((c) => c._id)), name = new Map(scope.map((c) => [c._id, c.fa]));
  const rows = (await items.find({}).toArray()).filter((r) => ids.has(r.categoryId)).sort((a, b) => scope.findIndex((c) => c._id === a.categoryId) - scope.findIndex((c) => c._id === b.categoryId) || byOrder(a, b));
  if (rows.length > MAX_BULK_ITEMS) return { fail: fail(413, 'bad_request') };
  const plan = [];
  for (const r of rows) {
    const to = newPrice(r.price, x.direction, x.percent, x.round);
    if (to !== r.price) plan.push({ _id: r._id, id: String(r._id), fa: r.name?.fa || '', cat: name.get(r.categoryId) || '', from: r.price, to });
  }
  return { x, rows, plan };
}
export async function bulkPreview(d, body) {
  const p = await planBulk(d, body);
  if (p.fail) return p.fail;
  const pick = p.plan.length > 6 ? [0, 1, 2, Math.floor(p.plan.length / 2), p.plan.length - 2, p.plan.length - 1].map((i) => p.plan[i]) : p.plan;
  return ok({ total: p.rows.length, changed: p.plan.length, sample: pick.map(({ fa, cat, from, to }) => ({ fa, cat, from, to })) });
}
export async function bulkApply(d, actor, body) {
  const p = await planBulk(d, body);
  if (p.fail) return p.fail;
  if (!p.plan.length) return ok({ changed: 0 });
  const { items } = col(d), log = d.collection('menu_price_changes');
  for (const c of p.plan) await items.updateOne({ _id: c._id }, { $set: { price: c.to } });
  await log.deleteOne({ _id: 'last' });
  await log.insertOne({ _id: 'last', createdAt: new Date(), by: actor?.user || '', direction: p.x.direction, percent: p.x.percent, round: p.x.round, scope: p.x.categoryIds || 'all', changes: p.plan.map(({ id, from, to }) => ({ id, from, to })) });
  return ok({ changed: p.plan.length });
}
export async function lastBulk(d) {
  const r = await d.collection('menu_price_changes').findOne({ _id: 'last' });
  return r ? { at: new Date(r.createdAt).toISOString(), by: r.by || '', direction: r.direction, percent: r.percent, count: r.changes.length } : null;
}
export async function bulkUndo(d) {
  const log = d.collection('menu_price_changes'), { items } = col(d);
  const r = await log.findOne({ _id: 'last' });
  if (!r) return fail(404, 'nothing_to_undo');
  let reverted = 0, skipped = 0;
  for (const c of r.changes) {
    const _id = toOid(c.id), it = _id && (await items.findOne({ _id }));
    if (it && it.price === c.to) { await items.updateOne({ _id }, { $set: { price: c.from } }); reverted++; } else skipped++;
  }
  await log.deleteOne({ _id: 'last' });
  return ok({ reverted, skipped });
}
