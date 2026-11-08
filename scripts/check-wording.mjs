// Finds informal / colloquial Persian wording in the site's texts and suggests a refined replacement.
//   npm run check:wording        (exit code 1 when something is found)
// Add a line to RULES whenever you notice another informal word. Dish names (lib/db/seed/menu.js) are not checked.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const W = '[\\u0600-\\u06FF]';                       // a Persian letter
const alone = (word) => new RegExp(`(?<!${W})${word}(?!${W})`);
const RULES = [
  [/همین[‌ ]?جا/, 'در همین مکان / در همین بخش'], [/دورهمی/, 'گردهمایی'], [/بزنید/, 'انتخاب کنید / کلیک کنید'], [alone('خیلی'), 'بسیار'],
  [alone('کلی'), 'فراوان'], [/تازه[‌ ]?کنید/, 'به‌روزرسانی کنید'], [alone('موقع'), 'هنگام'], [/امتحان کنید/, 'برگزینید / تلاش کنید'],
  [/پیدا نشد/, 'یافت نشد'], [alone('تیک'), 'علامت / انتخاب'], [alone('گپ'), 'گفت‌وگو'], [/قرار (?:خاص|دو)/, 'دیدار ویژه / دیدار دونفره'],
  [/سر بزنید/, 'میهمان ما باشید'], [/خبردار/, 'آگاه'], [alone('یه'), 'یک'], [/می‌?خوا[یم]|نمی‌?خوام|بذار/, 'می‌خواهید / می‌خواهم / بگذارید'],
  [/اینجوری|اونجا|چطوری/, 'این‌گونه / آنجا / چگونه'], [alone('چیه'), 'چیست'], [/مطمئنی/, 'اطمینان دارید'], [/نیامد/, 'کنسلی (عبارت انتخاب‌شده)'],
];
const fa = new RegExp(W);
const skip = (p) => p.replace(/\\/g, '/').endsWith('lib/db/seed/menu.js');
let hits = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== '.next') walk(p); continue; }
    if (!/\.(js|mjs|webmanifest)$/.test(name) || skip(p)) continue;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (!fa.test(line)) return;
      for (const [re, fix] of RULES) { const m = line.match(re); if (m) { hits++; console.log(`${p}:${i + 1}  «${m[0]}»  →  ${fix}`); } }
    });
  }
}
for (const d of ['app', 'components', 'lib', 'public']) walk(d);
console.log(hits ? `\n${hits} informal wording(s) found.` : 'Wording check passed: no informal terms found.');
process.exit(hits ? 1 : 0);
