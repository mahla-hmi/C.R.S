// Password hashing with scrypt (built into Node, no extra package). Server only (not usable in the Edge middleware).
import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(_scrypt);
const N = 16384, R = 8, P = 1, LEN = 64;

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(String(pw), salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, n, r, p, s, h] = String(stored).split('$');
  if (alg !== 'scrypt' || !s || !h) return false;
  const expected = Buffer.from(h, 'base64');
  const key = await scrypt(String(pw), Buffer.from(s, 'base64'), expected.length, { N: +n, r: +r, p: +p });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
let dummy; // compared against when the username does not exist, so "unknown user" and "wrong password" take equally long
export const dummyHash = () => (dummy ||= hashPassword('not-a-real-password'));
