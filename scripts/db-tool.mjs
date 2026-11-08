// Backup / restore of the local Docker database.
//   npm run db:backup                         -> backups/<db>-<date>.archive.gz
//   npm run db:restore -- backups/x.archive.gz --yes     (REPLACES the current data)
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';

const env = { ...process.env };
try {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* .env.local is optional: defaults below match docker-compose.yml */ }
const user = env.MONGO_ROOT_USER || 'root';
const pass = env.MONGO_ROOT_PASSWORD || 'dev-root-pass';
const dbName = env.MONGODB_DB || 'cafe';
const auth = [`--username=${user}`, `--password=${pass}`, '--authenticationDatabase=admin'];
const exec = (...args) => spawn('docker', ['compose', 'exec', '-T', 'mongo', ...args], { stdio: ['pipe', 'pipe', 'inherit'] });
const done = (child) => new Promise((res, rej) => { child.on('error', rej); child.on('close', (c) => (c === 0 ? res() : rej(new Error(`exit code ${c}`)))); });

const [cmd, file, flag] = process.argv.slice(2);
try {
  if (cmd === 'backup') {
    mkdirSync('backups', { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const out = `backups/${dbName}-${stamp}.archive.gz`;
    const child = exec('mongodump', ...auth, `--db=${dbName}`, '--archive', '--gzip');
    child.stdout.pipe(createWriteStream(out));
    try { await done(child); } catch (e) { rmSync(out, { force: true }); throw e; }
    console.log(`Backup saved: ${out}`);
  } else if (cmd === 'restore') {
    if (!file || !existsSync(file)) throw new Error('Usage: npm run db:restore -- backups/<file>.archive.gz --yes');
    if (flag !== '--yes') throw new Error('This REPLACES the current data. Add --yes to continue.');
    const child = exec('mongorestore', ...auth, '--archive', '--gzip', '--drop', `--nsInclude=${dbName}.*`);
    createReadStream(file).pipe(child.stdin);
    child.stdout.on('data', (d) => process.stdout.write(d));
    await done(child);
    console.log('Restore finished.');
  } else throw new Error('Usage: node scripts/db-tool.mjs backup | restore <file> --yes');
} catch (e) { console.error(e.message); process.exit(1); }
