// Validation and cleaning of menu edits (pure functions, no database). Used by the API routes and by lib/admin/menu-ops.js.
// Every function returns { value } or { error, field }; the error codes are translated in lib/admin/i18n.js (menu.errors).
export const MAX_PRICE = 100000000; // full toman
export const MAX_NAME = 60;

// Persian (U+06F0-06F9) / Arabic-Indic (U+0660-0669) digits -> 0-9. Written as escapes on purpose: this file holds no visible Persian text.
export const normDigits = (s) => String(s ?? '').replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x06f0).replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x0660);
// names: Arabic yeh/kaf (U+064A, U+0643) -> Persian yeh/kaf (U+06CC, U+06A9), so the Arabic and Persian spelling of a word are the same;
// repeated spaces collapse. The half-space (ZWNJ, U+200C) is kept.
export const cleanText = (s) => String(s ?? '').replace(/\u064A/g, '\u06CC').replace(/\u0643/g, '\u06A9').replace(/\s+/g, ' ').trim();

// "370,000" / "۳۷۰٬۰۰۰" / 370000 -> 370000 (whole toman, 1 .. MAX_PRICE); anything else -> null
export function parsePrice(v) {
  let n;
  if (typeof v === 'number') n = v;
  else {
    const s = normDigits(v).replace(/[,\u066C\u060C\s]/g, '');
    if (!/^\d{1,9}$/.test(s)) return null;
    n = Number(s);
  }
  return Number.isInteger(n) && n >= 1 && n <= MAX_PRICE ? n : null;
}

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 64;

function names(b, out, creating, max) {
  if (creating || has(b, 'fa')) {
    const fa = cleanText(b.fa);
    if (!fa) return { error: 'name_required', field: 'fa' };
    if (fa.length > max) return { error: 'name_long', field: 'fa' };
    out.fa = fa;
  }
  if (has(b, 'en')) {
    const en = cleanText(b.en);
    if (en.length > max) return { error: 'name_long', field: 'en' };
    out.en = en || null; // null = remove the English name
  }
  return null;
}
function image(b, out) {
  if (!has(b, 'imageId')) return null;
  if (b.imageId === null) { out.imageId = null; return null; }
  if (!/^[0-9a-f-]{36}$/.test(String(b.imageId))) return { error: 'image_invalid', field: 'image' };
  out.imageId = String(b.imageId);
  return null;
}

export function validateItem(b, { creating }) {
  b = b && typeof b === 'object' ? b : {};
  const v = {};
  let e = names(b, v, creating, MAX_NAME);
  if (e) return e;
  if (creating || has(b, 'price')) {
    const p = parsePrice(b.price);
    if (p === null) return { error: 'price_invalid', field: 'price' };
    v.price = p;
  }
  if (has(b, 'available')) { if (typeof b.available !== 'boolean') return { error: 'bad_request', field: 'available' }; v.available = b.available; }
  if (creating || has(b, 'categoryId')) { if (!isId(b.categoryId)) return { error: 'category_invalid', field: 'categoryId' }; v.categoryId = b.categoryId; }
  e = image(b, v);
  if (e) return e;
  return { value: v };
}

export function validateCategory(b, { creating }) {
  b = b && typeof b === 'object' ? b : {};
  const v = {};
  let e = names(b, v, creating, 40);
  if (e) return e;
  if (has(b, 'visible')) { if (typeof b.visible !== 'boolean') return { error: 'bad_request', field: 'visible' }; v.visible = b.visible; }
  e = image(b, v);
  if (e) return e;
  return { value: v };
}

export const isMove = (m) => m === 'up' || m === 'down';

// ---- uploaded photos (already resized by the browser) ----
export const IMG_MAX_BIG = 1200 * 1024, IMG_MAX_THUMB = 300 * 1024;
// looks at the first bytes, never at the file name or the type the browser claims
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
export const validLqip = (s) => typeof s === 'string' && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]{8,4000}$/.test(s);

// ---- bulk price change (owner only): "raise / lower every price by N %" ----
export const BULK_ROUNDS = [1, 1000, 5000, 10000]; // round each new price to the nearest N toman (1 = no rounding)
export const BULK_MAX_UP = 300, BULK_MAX_DOWN = 90; // percent limits, a typing slip like 500 or 100 is refused
export function parsePercent(v) { // "10", "۱۲٫۵", "7.5%" -> number (up to 2 decimals), anything else -> null
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 && Math.round(v * 100) === v * 100 ? v : null;
  const s = normDigits(v).replace(/[,\u066B]/g, '.').replace(/[%\u066A\s]/g, '');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
export function validateBulk(b) {
  b = b && typeof b === 'object' ? b : {};
  if (b.direction !== 'up' && b.direction !== 'down') return { error: 'bad_request', field: 'direction' };
  const percent = parsePercent(b.percent);
  if (percent === null || percent > (b.direction === 'up' ? BULK_MAX_UP : BULK_MAX_DOWN)) return { error: 'percent_invalid', field: 'percent' };
  const round = Number(b.round ?? 1000);
  if (!BULK_ROUNDS.includes(round)) return { error: 'round_invalid', field: 'round' };
  let categoryIds = null; // null = every category
  if (b.scope !== undefined && b.scope !== 'all') {
    if (!Array.isArray(b.scope) || !b.scope.length || b.scope.length > 200 || !b.scope.every(isId)) return { error: 'scope_empty', field: 'scope' };
    categoryIds = [...new Set(b.scope)];
  }
  return { value: { direction: b.direction, percent, round, categoryIds } };
}
// one price -> its new price (whole toman, never below one rounding step, never above MAX_PRICE)
export function newPrice(old, direction, percent, step) {
  const x = Math.round((old * (direction === 'up' ? 1 + percent / 100 : 1 - percent / 100)) / step) * step;
  return Math.min(MAX_PRICE, Math.max(step, x));
}
