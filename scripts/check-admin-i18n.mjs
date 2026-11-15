// Verifies the owner panel's two languages: same keys, same {placeholders}, and every t.xxx used in the code exists.
// Run: npm run check:admin-i18n
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const src = readFileSync(join(root, 'lib/admin/i18n.js'), 'utf8').replace(/import \{ fd \} from '\.\.\/booking';/, 'const fd = (x) => String(x);');
const tmp = join(mkdtempSync(join(tmpdir(), 'i18n-')), 'i18n.mjs');
writeFileSync(tmp, src);
const { A } = await import(pathToFileURL(tmp).href);

let bad = 0;
const fail = (m) => { bad++; console.error('✗ ' + m); };
const walk = (a, b, path) => {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return fail(`${path}: different kinds in fa/en`);
  if (typeof a === 'string') {
    const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    if (ph(a) !== ph(b)) fail(`${path}: placeholders differ ("${ph(a)}" vs "${ph(b)}")`);
    return;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  for (const k of ka) if (!kb.includes(k)) fail(`${path}.${k}: missing in en`);
  for (const k of kb) if (!ka.includes(k)) fail(`${path}.${k}: missing in fa`);
  for (const k of ka) if (kb.includes(k)) walk(a[k], b[k], `${path}.${k}`);
};
walk(A.fa, A.en, 'A');

// every file of the panel
const files = [];
const scan = (dir) => { for (const f of readdirSync(join(root, dir))) { const p = join(dir, f); const s = statSync(join(root, p)); if (s.isDirectory()) scan(p); else if (/\.js$/.test(f)) files.push(p); } };
['app/admin', 'components/admin', 'lib/admin', 'app/api/admin'].forEach(scan);
const resolve = (path) => path.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), A.fa);

for (const f of files) {
  if (f.endsWith('lib/admin/i18n.js')) continue;
  const code = readFileSync(join(root, f), 'utf8');
  // 1) texts written straight into the code (comments are fine)
  const noComments = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  noComments.split('\n').forEach((l, i) => { if (/[\u0600-\u06FF]/.test(l)) fail(`${f}:${i + 1}: Persian text outside the dictionary: ${l.trim().slice(0, 70)}`); });
  // 2) every dictionary path used (through t or an alias such as const D = t.dash)
  const alias = { t: [] };
  for (let round = 0; round < 3; round++) {
    for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)((?:\.[A-Za-z_]\w*)+)(?=[\s,;)])/g)) if (alias[m[2]] && !alias[m[1]]) alias[m[1]] = [...alias[m[2]], ...m[3].slice(1).split('.')];
    for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*=\s*useAdmin\(\)\.t((?:\.[A-Za-z_]\w*)+)/g)) alias[m[1]] = m[2].slice(1).split('.');
  }
  const hasT = /\bt\b/.test(code) && (/useAdmin\(\)/.test(code) || /adminI18n\(\)/.test(code));
  if (!hasT) delete alias.t;
  for (const [name, base] of Object.entries(alias)) {
    for (const m of code.matchAll(new RegExp(`(?<![\\w.$])${name}((?:\\.[A-Za-z_]\\w*)+)`, 'g'))) {
      const full = [...base, ...m[1].slice(1).split('.')];
      // a dotted path may continue into a method/property of a string (".length") or an object value: only the part up to a missing key matters
      let o = A.fa, ok = true;
      for (const k of full) { if (o && typeof o === 'object' && k in o) o = o[k]; else { ok = typeof o === 'string' || Array.isArray(o); break; } }
      if (!ok) fail(`${f}: ${name}${m[1]} -> t.${full.join('.')} does not exist`);
    }
  }
}
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }
console.log('Admin i18n check passed: fa and en match, every key used exists, no Persian text left in the code.');
