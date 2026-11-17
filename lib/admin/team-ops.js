// Team-member operations on the `admins` collection. Every function returns { status, body } so the API routes stay thin
// and this file can be tested with an in-memory collection. Ids are random UUID strings (no ObjectId needed).
import { randomUUID } from 'node:crypto';
import { adminName } from './auth';
import { hashPassword, verifyPassword, dummyHash } from './password';
import { validateMember } from './team';

const fail = (status, error, field) => ({ status, body: { error, ...(field ? { field } : {}) } });
const ok = (extra = {}) => ({ status: 200, body: { ok: true, ...extra } });
export const publicMember = (m) => ({
  id: m._id, username: m.username, name: m.name, role: m.role, perms: m.perms || [], active: !!m.active,
  createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null, lastLoginAt: m.lastLoginAt ? new Date(m.lastLoginAt).toISOString() : null, createdBy: m.createdBy || '',
}); // never includes the password hash

export const findMemberByUsername = (col, username) => col.findOne({ username: String(username || '').trim().toLowerCase() });
export async function listMembers(col) {
  return (await col.find({}).sort({ createdAt: 1 }).toArray()).map(publicMember);
}

// login of a team member; null = wrong username, wrong password or disabled account
export async function verifyMemberLogin(col, username, password) {
  const m = await findMemberByUsername(col, username);
  const okPass = await verifyPassword(String(password || ''), m?.passHash || (await dummyHash()));
  return m && m.active && okPass ? m : null;
}
export const touchLogin = (col, id) => col.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });

export async function createMember(col, actor, body) {
  const v = validateMember(body, { creating: true });
  if (v.error) return fail(400, v.error, v.field);
  const x = v.value;
  if (x.username === adminName().toLowerCase()) return fail(409, 'username_taken', 'username'); // the main owner's name is reserved
  const doc = { _id: randomUUID(), username: x.username, name: x.name, role: x.role, perms: x.perms, active: true,
    passHash: await hashPassword(x.password), tokenVersion: 0, createdAt: new Date(), createdBy: actor.user, lastLoginAt: null };
  try { await col.insertOne(doc); } catch (e) { if (e?.code === 11000) return fail(409, 'username_taken', 'username'); throw e; }
  return ok({ id: doc._id });
}

export async function updateMember(col, actor, id, body) {
  const v = validateMember(body, { creating: false });
  if (v.error) return fail(400, v.error, v.field);
  const x = v.value;
  const target = await col.findOne({ _id: String(id) });
  if (!target) return fail(404, 'not_found');
  const self = !actor.primary && actor.id === target._id;
  // an owner cannot lock themselves out by accident
  if (self && ((x.role && x.role !== target.role) || x.active === false)) return fail(403, 'self_forbidden');
  const { password, ...set } = x;
  set.updatedAt = new Date();
  const update = { $set: set };
  let bump = false;
  const nextTv = (target.tokenVersion || 0) + 1; // computed before the update
  if (password) { set.passHash = await hashPassword(password); bump = true; }          // old sessions stop working
  if (x.active === false && target.active) bump = true;
  if (bump) update.$inc = { tokenVersion: 1 };
  await col.updateOne({ _id: target._id }, update);
  // someone changing their OWN password gets a fresh cookie, otherwise they would be logged out immediately
  return ok(self && password ? { reissue: { username: target.username, tv: nextTv } } : {});
}

export async function deleteMember(col, actor, id) {
  const target = await col.findOne({ _id: String(id) });
  if (!target) return fail(404, 'not_found');
  if (!actor.primary && actor.id === target._id) return fail(403, 'self_forbidden');
  await col.deleteOne({ _id: target._id });
  return ok({ username: target.username });
}
