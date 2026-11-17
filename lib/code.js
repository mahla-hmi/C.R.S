import { randomBytes } from 'node:crypto';
// Tracking code printed on the guest's SMS and shown in "My reservations". No 0/O/1/I/L so it can be read over the phone.
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const makeCode = () => Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join('');
