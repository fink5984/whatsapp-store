import 'server-only';
import sharp from 'sharp';

/**
 * Fetch a remote image, downscale it, and return base64 (no data URI prefix).
 * WhatsApp Flow's RadioButtonsGroup item.image expects raw base64 of an image.
 *
 * Cached in memory per process for 24h (process restart clears it).
 */

interface CacheEntry {
  base64: string;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

function purgeIfNeeded() {
  if (cache.size <= MAX_ENTRIES) return;
  const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]?.[0];
  if (oldest) cache.delete(oldest);
}

export async function fetchImageAsBase64(
  url: string | null | undefined,
  size = 120,
): Promise<string | null> {
  if (!url) return null;
  const key = `${url}|${size}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.base64;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;

    const resized = await sharp(buf)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();

    const base64 = resized.toString('base64');
    purgeIfNeeded();
    cache.set(key, { base64, ts: Date.now() });
    return base64;
  } catch (err) {
    console.warn(`fetchImageAsBase64 failed for ${url}:`, (err as Error).message);
    return null;
  }
}

/** Resolve thumbnails for many URLs in parallel. Falls back to null on failure. */
export async function fetchManyAsBase64(
  urls: (string | null | undefined)[],
  size = 120,
): Promise<(string | null)[]> {
  return Promise.all(urls.map((u) => fetchImageAsBase64(u, size)));
}
