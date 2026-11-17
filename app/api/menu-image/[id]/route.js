import { db } from '@/lib/mongo';

// Public: serves a menu photo uploaded in the owner panel. ?s=1 gives the small thumbnail.
// The id is random and a replaced photo gets a new id, so the browser may keep it for a year.
export async function GET(req, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const im = await (await db()).collection('menu_images').findOne({ _id: id });
    if (!im) return new Response(null, { status: 404 });
    const small = new URL(req.url).searchParams.get('s') === '1' && im.thumb;
    const raw = small ? im.thumb : im.data;
    const buf = Buffer.from(raw.buffer ?? raw);
    return new Response(buf, { headers: {
      'Content-Type': (small ? im.thumbType : im.type) || 'image/webp',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (e) { console.error('[menu-image]', e?.message); return new Response(null, { status: 500 }); }
}
