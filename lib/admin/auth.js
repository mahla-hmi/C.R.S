// Owner login: a signed session cookie (HMAC-SHA256 through Web Crypto, so it works in middleware AND in Node).
// PLACEHOLDER credentials until the real login method is decided: set ADMIN_USER / ADMIN_PASSWORD / ADMIN_SECRET in .env.local.
const enc = new TextEncoder();
export const COOKIE = 'cafe_admin';
export const SESSION_HOURS = 12;
const DEV_USER = 'owner', DEV_PASS = 'cafe-admin-123', DEV_SECRET = 'dev-only-secret-change-me';
const user = () => process.env.ADMIN_USER || DEV_USER;
const pass = () => process.env.ADMIN_PASSWORD || DEV_PASS;
const secret = () => process.env.ADMIN_SECRET || DEV_SECRET;
export const adminName = user;
export const usingDefaults = () => !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET;
export const devHint = () => (usingDefaults() && process.env.NODE_ENV !== 'production' ? { user: user(), password: pass() } : null);

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const hmac = async (data) => crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(data));
const sha = async (s) => b64u(await crypto.subtle.digest('SHA-256', enc.encode(String(s))));
function same(a, b) { // constant-time string compare
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function checkLogin(u, p) {
  const [a, b, c, d] = await Promise.all([sha(u), sha(user()), sha(p), sha(pass())]);
  const okUser = same(a, b), okPass = same(c, d); // both always evaluated
  return okUser && okPass;
}
// extra: { k: 'p' | 'd', tv } = who the session is for (main owner / team member) and the member's token version
export async function signSession(name, hours = SESSION_HOURS, extra = {}) {
  const payload = b64u(enc.encode(JSON.stringify({ u: name, exp: Math.floor(Date.now() / 1000) + hours * 3600, ...extra })));
  return `${payload}.${b64u(await hmac(payload))}`;
}
export async function verifySession(token) {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !same(sig, b64u(await hmac(payload)))) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    return p.exp > Date.now() / 1000 ? { user: String(p.u), kind: p.k === 'd' ? 'd' : 'p', tv: Number(p.tv) || 0 } : null;
  } catch { return null; }
}

export const cookieOptions = () => ({
  httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600,
  secure: process.env.NODE_ENV === 'production', // production needs HTTPS to keep the login
});
