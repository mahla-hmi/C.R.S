// VAPID key pair for Web Push (P-256), raw base64url format. No imports, so scripts/push-keys.mjs can use it directly.
import { createECDH } from 'node:crypto';
export function generateVapidKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const priv = ecdh.getPrivateKey();
  const privateKey = Buffer.concat([Buffer.alloc(32 - priv.length), priv]); // always exactly 32 bytes
  return { publicKey: ecdh.getPublicKey().toString('base64url'), privateKey: privateKey.toString('base64url') };
}
