// Versioned, idempotent migrations. Applied ids are stored in the `_migrations` collection,
// so every environment (your laptop, the VPS) ends up with the same indexes, validators and seed data.
// RULE: never edit a migration that has already run somewhere; add a new one at the end of MIGRATIONS.
import { nameKeyOf, phoneKeyOf } from '../identity';
import { TABLES } from './seed/tables';
import { MENU } from './seed/menu';

const STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show'];
const str = { bsonType: 'string' };
const num = (extra = {}) => ({ bsonType: 'number', ...extra }); // "number" = int, long or double

// validationLevel "moderate": documents written by older versions are left alone; every new write is checked.
async function ensureCollection(db, name, schema) {
  const opts = { validator: { $jsonSchema: schema }, validationLevel: 'moderate', validationAction: 'error' };
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  if (!exists) {
    try { await db.createCollection(name, opts); return; } catch (e) { if (e?.code !== 48) throw e; } // 48 = created by someone else meanwhile
  }
  await db.command({ collMod: name, ...opts });
}
const ignoreDuplicates = (e) => { if (e?.code !== 11000) throw e; }; // another process seeded at the same moment

export const MIGRATIONS = [
  {
    id: '001_reservations',
    async up(db) {
      const col = db.collection('reservations');
      // lookup keys for "My reservations" on documents written before they existed
      const old = await col.find({ nameKey: { $exists: false } }, { projection: { name: 1, phone: 1 } }).limit(5000).toArray();
      if (old.length) await col.bulkWrite(old.map((r) => ({ updateOne: { filter: { _id: r._id }, update: { $set: { nameKey: nameKeyOf(r.name), phoneKey: phoneKeyOf(r.phone) } } } })));
      await ensureCollection(db, 'reservations', {
        bsonType: 'object',
        required: ['code', 'date', 'startMin', 'endMin', 'durationMin', 'tableId', 'guests', 'name', 'phone', 'nameKey', 'phoneKey', 'cells', 'active', 'status', 'createdAt'],
        properties: {
          code: str, tableId: str, name: str, phone: str, nameKey: str, phoneKey: str, purpose: str, note: str,
          date: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          startMin: num({ minimum: 0, maximum: 1440 }), endMin: num({ minimum: 0, maximum: 1440 }), durationMin: num({ minimum: 15 }),
          guests: num({ minimum: 1 }), active: { bsonType: 'bool' }, status: { enum: STATUSES },
          cells: { bsonType: 'array', items: num() }, createdAt: { bsonType: 'date' },
          locale: { enum: ['fa', 'en'] },
        },
      });
      await col.dropIndex('date_1_slot_1_tableId_1').catch(() => {}); // step-3 index; can't describe variable-length stays
      // Each active booking stores the 15-min cells it blocks; this unique index makes MongoDB itself refuse overlaps, even under races.
      await col.createIndex({ date: 1, tableId: 1, cells: 1 }, { name: 'no_overlap', unique: true, partialFilterExpression: { active: true } });
      await col.createIndex({ code: 1 }, { unique: true });
      await col.createIndex({ date: 1, active: 1 });            // availability per day
      await col.createIndex({ phoneKey: 1, nameKey: 1 });       // "My reservations"
      await col.createIndex({ status: 1, date: 1 });            // admin: pending list
    },
  },
  {
    id: '002_catalog',
    async up(db) {
      await ensureCollection(db, 'tables', {
        bsonType: 'object', required: ['seats', 'x', 'y', 'zone', 'order'],
        properties: { seats: num({ minimum: 1 }), x: num({ minimum: 0, maximum: 100 }), y: num({ minimum: 0, maximum: 100 }), zone: str, order: num(), active: { bsonType: 'bool' } },
      });
      await ensureCollection(db, 'menu_categories', {
        bsonType: 'object', required: ['fa', 'order'],
        properties: { fa: str, en: str, order: num(), visible: { bsonType: 'bool' } },
      });
      await ensureCollection(db, 'menu_items', {
        bsonType: 'object', required: ['categoryId', 'name', 'price', 'order'],
        properties: { categoryId: str, name: { bsonType: 'object', required: ['fa'], properties: { fa: str, en: str } }, price: num({ minimum: 0 }), order: num(), available: { bsonType: 'bool' } },
      });
      const items = db.collection('menu_items');
      await db.collection('tables').createIndex({ order: 1 });
      await db.collection('menu_categories').createIndex({ order: 1 });
      await items.createIndex({ categoryId: 1, 'name.fa': 1 }, { unique: true });
      await items.createIndex({ categoryId: 1, order: 1 });

      // first start only: load the initial floor plan and menu (prices are full toman)
      if ((await db.collection('tables').estimatedDocumentCount()) === 0)
        await db.collection('tables').insertMany(TABLES.map((t, i) => ({ _id: t.id, seats: t.seats, x: t.x, y: t.y, zone: t.zone, active: true, order: i })), { ordered: false }).catch(ignoreDuplicates);
      if ((await db.collection('menu_categories').estimatedDocumentCount()) === 0)
        await db.collection('menu_categories').insertMany(MENU.map((c, i) => ({ _id: c.id, fa: c.fa, en: c.en, order: i, visible: true })), { ordered: false }).catch(ignoreDuplicates);
      if ((await items.estimatedDocumentCount()) === 0)
        await items.insertMany(MENU.flatMap((c) => c.items.map((it, i) => ({ categoryId: c.id, name: { fa: it.n }, price: it.p, order: i, available: true }))), { ordered: false }).catch(ignoreDuplicates);
    },
  },
  {
    id: '003_admins',
    async up(db) {
      // owner-panel team members (the main owner lives in .env.local and is not stored here)
      await ensureCollection(db, 'admins', {
        bsonType: 'object', required: ['username', 'name', 'role', 'active', 'passHash', 'tokenVersion', 'createdAt'],
        properties: { username: str, name: str, role: { enum: ['owner', 'staff'] }, perms: { bsonType: 'array', items: str }, active: { bsonType: 'bool' }, passHash: str, tokenVersion: num({ minimum: 0 }), createdAt: { bsonType: 'date' } },
      });
      await db.collection('admins').createIndex({ username: 1 }, { name: 'username_unique', unique: true });
    },
  },
  {
    id: '004_push',
    async up(db) {
      // devices (browsers/phones) that receive "new reservation" notifications
      await ensureCollection(db, 'push_subscriptions', {
        bsonType: 'object', required: ['endpoint', 'keys', 'user', 'kind', 'createdAt'],
        properties: { endpoint: str, user: str, kind: { enum: ['p', 'd'] }, keys: { bsonType: 'object', required: ['p256dh', 'auth'], properties: { p256dh: str, auth: str } }, createdAt: { bsonType: 'date' } },
      });
      await db.collection('push_subscriptions').createIndex({ user: 1 });
    },
  },
  {
    id: '005_guest_push',
    async up(db) {
      // devices of guests who asked for booking notifications; each row is deleted automatically after expireAt
      await ensureCollection(db, 'guest_push', {
        bsonType: 'object', required: ['endpoint', 'keys', 'code', 'expireAt', 'createdAt'],
        properties: { endpoint: str, code: str, keys: { bsonType: 'object', required: ['p256dh', 'auth'], properties: { p256dh: str, auth: str } }, expireAt: { bsonType: 'date' }, createdAt: { bsonType: 'date' } },
      });
      await db.collection('guest_push').createIndex({ code: 1 }, { name: 'code_1' });
      await db.collection('guest_push').createIndex({ expireAt: 1 }, { name: 'expire_ttl', expireAfterSeconds: 0 });
    },
  },
];

export async function runMigrations(db) {
  const log = db.collection('_migrations');
  const done = new Set((await log.find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await m.up(db);
    await log.updateOne({ _id: m.id }, { $setOnInsert: { appliedAt: new Date() } }, { upsert: true });
    console.log(`[db] migration applied: ${m.id}`);
  }
}
