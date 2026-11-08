// Validation of the "add / edit member" form. Pure function (unit-tested); returns { error, field } or { value }.
import { normalizePerms, ALL_PERMS } from './permissions';

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/; // lowercase latin letters, digits, . _ -  (3 to 32 chars)

export function validateMember(b, { creating }) {
  b = b || {};
  const out = {};
  if (creating || b.name !== undefined) {
    const name = String(b.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 60) return { error: 'name_short', field: 'name' };
    out.name = name;
  }
  if (creating) {
    const username = String(b.username || '').trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return { error: 'username_format', field: 'username' };
    out.username = username;
  }
  if (creating || (b.password !== undefined && b.password !== '')) {
    const pw = String(b.password ?? '');
    if (pw.length < 8) return { error: 'password_short', field: 'password' };
    if (pw.length > 128) return { error: 'password_long', field: 'password' };
    out.password = pw;
  }
  if (creating || b.role !== undefined) {
    if (b.role !== 'owner' && b.role !== 'staff') return { error: 'role_invalid', field: 'role' };
    out.role = b.role;
  }
  if (creating || b.perms !== undefined) {
    if (!Array.isArray(b.perms) || b.perms.some((p) => !ALL_PERMS.includes(p))) return { error: 'perms_invalid', field: 'perms' };
    out.perms = normalizePerms(b.perms);
  }
  if (b.active !== undefined) {
    if (typeof b.active !== 'boolean') return { error: 'bad_request', field: 'active' };
    out.active = b.active;
  }
  return { value: out };
}
