/**
 * scripts/upload-tokyo-images.ts
 *
 * Maps tokyo-catalog.json items to product names in the "סושי טוקיו" store,
 * downloads each image from the Tabit S3 bucket, uploads it to Supabase
 * Storage (`store-assets`), and updates `products.image_url`.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/upload-tokyo-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const STORE_ID = '39ae9282-6dfd-4b7b-915d-7d47b902a4a6';
const BUCKET = 'store-assets';
const CATALOG_PATH = join(__dirname, 'tokyo-catalog.json');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type CatalogItem = {
  _id: string;
  name?: string;
  image?: { url: string };
};
type CatalogOffer = {
  _id: string;
  itemId?: string;
  name?: string;
  itemName?: string;
};
type MenuViewItem = {
  _id: string;
  offer?: string;
  name?: string;
  customName?: string;
};
type MenuView = {
  type: string;
  name: string;
  items?: MenuViewItem[];
};

// Normalize names for matching: strip whitespace, allergen emojis, punctuation variants.
function normalize(s: string): string {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[׳'״"`]/g, "'")
    .replace(/[\s ]+/g, ' ')
    .replace(/[.,!?]/g, '')
    .trim()
    .toLowerCase();
}

async function downloadToBuffer(url: string): Promise<{ buf: Buffer; contentType: string; ext: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  // pick extension from content-type, falling back to URL extension or .jpg
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
  else {
    const m = url.match(/\.([a-zA-Z0-9]{3,4})$/);
    if (m) ext = m[1].toLowerCase();
  }
  return { buf, contentType, ext };
}

async function main() {
  // 1. Load catalog and build image lookup
  const raw = readFileSync(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(raw) as {
    offers: CatalogOffer[];
    items: CatalogItem[];
    view: MenuView[];
  };

  const itemById = new Map<string, CatalogItem>();
  for (const it of catalog.items) itemById.set(it._id, it);

  const offerById = new Map<string, CatalogOffer>();
  for (const off of catalog.offers) offerById.set(off._id, off);

  // For each menu-view item, resolve to (name, image url) via offer → itemId → item.image
  type Resolved = { name: string; imageUrl: string };
  const byNorm = new Map<string, Resolved>();
  let totalItems = 0;
  let withImage = 0;
  for (const view of catalog.view ?? []) {
    if (view.type !== 'menu' || !Array.isArray(view.items)) continue;
    for (const vi of view.items) {
      totalItems++;
      const offer = vi.offer ? offerById.get(vi.offer) : undefined;
      const itemId = offer?.itemId;
      const item = itemId ? itemById.get(itemId) : undefined;
      const url = item?.image?.url;
      if (!url) continue;
      withImage++;
      const displayName = vi.customName ?? vi.name ?? offer?.name ?? item?.name ?? '';
      const key = normalize(displayName);
      if (key) byNorm.set(key, { name: displayName, imageUrl: url });
      // Also index by the catalog item's plain `name` if different
      if (item?.name) {
        const k2 = normalize(item.name);
        if (k2 && !byNorm.has(k2)) byNorm.set(k2, { name: item.name, imageUrl: url });
      }
    }
  }
  console.log(`catalog: ${totalItems} items in views, ${withImage} have images, ${byNorm.size} unique normalized keys`);

  // 2. Fetch products from Supabase
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('store_id', STORE_ID);
  if (pErr) throw pErr;
  console.log(`products in store: ${products?.length}`);

  // 3. Match + upload
  let matched = 0;
  let skippedAlreadyHasImage = 0;
  let unmatched: string[] = [];
  let uploaded = 0;
  let failed: { name: string; err: string }[] = [];

  for (const p of products ?? []) {
    if (p.image_url) {
      skippedAlreadyHasImage++;
      continue;
    }
    const key = normalize(p.name);
    let hit = byNorm.get(key);
    // looser match: try stripping any leading "2 יחידות " prefix or substring contains
    if (!hit) {
      for (const [k, v] of byNorm) {
        if (k === key) { hit = v; break; }
        if (k.includes(key) || key.includes(k)) { hit = v; break; }
      }
    }
    if (!hit) {
      unmatched.push(p.name);
      continue;
    }
    matched++;

    try {
      const { buf, contentType, ext } = await downloadToBuffer(hit.imageUrl);
      const path = `stores/${STORE_ID}/products/${p.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buf, { upsert: true, contentType });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: updErr } = await supabase
        .from('products')
        .update({ image_url: pub.publicUrl })
        .eq('id', p.id);
      if (updErr) throw updErr;
      uploaded++;
      console.log(`✓ ${p.name}`);
    } catch (e: any) {
      failed.push({ name: p.name, err: e?.message ?? String(e) });
      console.error(`✗ ${p.name}: ${e?.message ?? e}`);
    }
  }

  console.log('\n=== summary ===');
  console.log('matched:', matched);
  console.log('uploaded:', uploaded);
  console.log('already had image (skipped):', skippedAlreadyHasImage);
  console.log('unmatched products:', unmatched.length);
  if (unmatched.length) {
    console.log('  unmatched names:');
    unmatched.forEach((n) => console.log('   - ' + n));
  }
  if (failed.length) {
    console.log('failed:', failed.length);
    failed.forEach((f) => console.log('   - ' + f.name + ': ' + f.err));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
