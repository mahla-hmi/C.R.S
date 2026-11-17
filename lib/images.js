// Every photo on the site is served from /public/images. Nothing is loaded from other websites.
// A photo is looked up by its id (file name without extension). Supported: .avif .webp .jpg .jpeg .png
// To replace a stand-in with the real photo, just drop "<id>.avif" (or .webp/.jpg) into public/images: it is picked up automatically.
// Optional: add its entry to lib/images.manifest.json to get the blurred placeholder while it loads.
import fs from 'node:fs';
import path from 'node:path';
import manifest from './images.manifest.json';

// Photos we still do not have -> temporary local stand-ins (swap by adding the real file, see above).
export const STANDIN = {
  'photo-1495474472287-4d71bcdd2085': 'photo-1534040385115-33dcb3acba5b', // hero + 3rd menu card
};
const EXT = ['avif', 'webp', 'jpg', 'jpeg', 'png'];
const dir = path.join(process.cwd(), 'public', 'images');
const memo = new Map();

function find(id) {
  for (const e of EXT) if (fs.existsSync(path.join(dir, `${id}.${e}`))) return `${id}.${e}`;
  return null;
}
export function photo(id) {
  const prod = process.env.NODE_ENV === 'production';
  if (prod && memo.has(id)) return memo.get(id);
  const file = find(id) || (STANDIN[id] && find(STANDIN[id])) || null;
  const out = file ? { src: `/images/${file}`, lqip: manifest[file]?.lqip || null } : null;
  if (prod) memo.set(id, out);
  return out;
}
