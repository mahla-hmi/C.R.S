// Server-side reads shared by pages and API routes.
import { db } from './mongo';
import { MENU as BUILT_IN_MENU } from './db/seed/menu';

// Floor plan: [{ id, seats, x, y, zone }] in display order.
export async function getTables() {
  const rows = await (await db()).collection('tables').find({ active: { $ne: false } }).sort({ order: 1 }).toArray();
  return rows.map(({ _id, seats, x, y, zone }) => ({ id: _id, seats, x, y, zone }));
}

// Menu in the shape the UI expects: [{ id, fa, en, items: [{ n, p }] }] (p = full toman).
// Hides categories/items switched off in the database. If the database is down the guest still gets the built-in menu.
export async function getMenu() {
  try {
    const d = await db();
    const cats = await d.collection('menu_categories').find({ visible: { $ne: false } }).sort({ order: 1 }).toArray();
    const items = await d.collection('menu_items').find({ available: { $ne: false } }).sort({ order: 1 }).toArray();
    const by = new Map();
    for (const it of items) (by.get(it.categoryId) || by.set(it.categoryId, []).get(it.categoryId)).push({ n: it.name.fa, p: it.price });
    const menu = cats.map((c) => ({ id: c._id, fa: c.fa, en: c.en || c.fa, items: by.get(c._id) || [] })).filter((c) => c.items.length);
    if (menu.length) return menu;
    throw new Error('menu collections are empty');
  } catch (e) {
    console.error('[db] menu: using built-in data:', e.message);
    return BUILT_IN_MENU;
  }
}
