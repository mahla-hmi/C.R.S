// MongoDB connection (one shared client per server process) + automatic, versioned migrations.
import { MongoClient } from 'mongodb';
import { runMigrations } from './db/migrations';

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafe';
// db name: MONGODB_DB, else the path of the URI, else "cafe" (never MongoDB's default "test")
const DB_NAME = process.env.MONGODB_DB || (URI.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/) || [])[1] || 'cafe';

const g = globalThis; // survives hot-reload in `next dev`
export async function db() {
  if (!g._cafeDb) {
    g._cafeDb = (async () => {
      const client = new MongoClient(URI, { appName: 'cafe-app', maxPoolSize: 10, serverSelectionTimeoutMS: 3000 });
      try {
        await client.connect();
        const d = client.db(DB_NAME);
        await runMigrations(d);
        return d;
      } catch (e) { await client.close().catch(() => {}); throw e; }
    })().catch((e) => { g._cafeDb = null; throw e; }); // never cache a failed connection
  }
  return g._cafeDb;
}
