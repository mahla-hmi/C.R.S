import { NextResponse } from 'next/server';
import { db } from '@/lib/mongo';
import { adminGuard } from '@/lib/admin/server';
import { saveImage } from '@/lib/admin/menu-ops';
import { IMG_MAX_BIG } from '@/lib/admin/menu';

// POST (multipart): upload one photo that the browser already resized: fields big (file), thumb (file), lqip (tiny data: url).
// Returns { id, lqip }; the id is then attached to an item/category with PATCH { imageId }.
export async function POST(req) {
  const g = await adminGuard(req, { perm: 'menu.manage' });
  if (g.res) return g.res;
  if (Number(req.headers.get('content-length') || 0) > IMG_MAX_BIG * 2) return NextResponse.json({ error: 'image_big' }, { status: 413 });
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'image_type' }, { status: 400 }); }
  const big = form.get('big'), thumb = form.get('thumb'), lqip = form.get('lqip');
  if (!big || !thumb || typeof big === 'string' || typeof thumb === 'string') return NextResponse.json({ error: 'image_type' }, { status: 400 });
  try {
    const r = await saveImage(await db(), { big: Buffer.from(await big.arrayBuffer()), thumb: Buffer.from(await thumb.arrayBuffer()), lqip });
    return NextResponse.json(r.body, { status: r.status });
  } catch (e) { console.error('[admin] upload image:', e?.message); return NextResponse.json({ error: 'db' }, { status: 500 }); }
}
