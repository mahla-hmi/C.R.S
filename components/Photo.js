import { photo } from '@/lib/images';
// Local <img> with a blurred placeholder behind it, so the box is never empty while the file loads.
// priority = above-the-fold photo: loaded first. Everything else is lazy but starts early (and files are tiny).
export default function Photo({ id, priority = false, alt = '' }) {
  const p = photo(id);
  if (!p) return null;
  return (
    <img
      src={p.src} alt={alt}
      loading={priority ? 'eager' : 'lazy'} decoding={priority ? 'sync' : 'async'} fetchPriority={priority ? 'high' : 'auto'}
      style={p.lqip ? { backgroundImage: `url(${p.lqip})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    />
  );
}
