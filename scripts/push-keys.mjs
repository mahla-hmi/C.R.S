// Optional: create VAPID keys yourself (otherwise the app creates and stores them in the database on first use).
//   npm run push:keys   ->  paste the two lines into .env.local
import { generateVapidKeys } from '../lib/vapid.js';
const k = generateVapidKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}`);
