/**
 * scripts/seed-shnitzka.ts
 *
 * Imports the Wolt venue "shnitzka" into Supabase:
 *   - creates the store (or reuses an existing one with the same slug)
 *   - inserts categories
 *   - inserts global option groups + options (only those referenced by items)
 *   - inserts products with prices (Wolt prices are in agorot → divide by 100)
 *   - links product_option_groups
 *   - downloads each item's image from imageproxy.wolt.com and uploads to
 *     Supabase Storage (`store-assets`), then writes `image_url` on each product
 *
 * Input files (extracted from Wolt page state earlier):
 *   scripts/wolt-venue.json       — venue meta
 *   scripts/wolt-categories.json  — categories, items, options
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-shnitzka.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const OWNER_ID = 'e36afcf2-e335-4179-8137-1cda801c04a7';
const SLUG = 'shnitzka';
const BUCKET = 'store-assets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type WoltVenue = {
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    image_url?: string;
    description?: string;
    short_description?: string;
  };
};

type WoltImage = { url: string };
type WoltItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: WoltImage[];
  options?: { id: string; option_id: string }[];
  disabled_info?: { is_disabled?: boolean } | null;
};

type WoltOptionValue = {
  id: string;
  name: string;
  price: number;
};
type WoltOption = {
  id: string;
  name: string;
  type: 'single_choice' | 'multi_choice' | string;
  values: WoltOptionValue[];
};
type WoltCategory = {
  id: string;
  name: string;
  item_ids?: string[];
};
type WoltAssortment = {
  categories: WoltCategory[];
  items: WoltItem[];
  options: WoltOption[];
};

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(__dirname, path), 'utf8')) as T;
}

async function downloadToBuffer(url: string): Promise<{ buf: Buffer; contentType: string; ext: string }> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('webp')) ext = 'webp';
  return { buf, contentType, ext };
}

async function main() {
  const venueWrap = loadJson<WoltVenue>('wolt-venue.json');
  const assortment = loadJson<WoltAssortment>('wolt-categories.json');
  const venue = venueWrap.venue;

  // 1. Create or reuse store
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', SLUG)
    .maybeSingle();

  let storeId: string;
  if (existing) {
    storeId = existing.id;
    console.log('reusing existing store:', storeId);
  } else {
    const { data: created, error: storeErr } = await supabase
      .from('stores')
      .insert({
        owner_id: OWNER_ID,
        name: venue.name,
        slug: SLUG,
        store_code: 'SHNZ',
        description: 'שניצלייה',
        city: 'בית שמש',
        address: venue.address,
        phone: venue.phone,
        category: 'שניצלייה',
        cover_image_url: venue.image_url ?? null,
        minimum_order: 50,
        default_delivery_fee: 25,
        estimated_preparation_minutes: 30,
      })
      .select()
      .single();
    if (storeErr) throw storeErr;
    storeId = created.id;
    console.log('created store:', storeId);
  }

  // 2. Collect option groups that are actually used by items
  const usedOptionIds = new Set<string>();
  for (const it of assortment.items) {
    for (const o of it.options ?? []) usedOptionIds.add(o.option_id);
  }

  // 3. Insert option groups + options, keep mapping
  const optionGroupMap = new Map<string, string>(); // wolt option_id → supabase group_id
  const optionValueMap = new Map<string, string>(); // wolt value.id → supabase option.id (NOT needed for now, but useful)
  for (const opt of assortment.options) {
    if (!usedOptionIds.has(opt.id)) continue;
    // Determine min/max/free_selections from any item reference (use the first one we find)
    let minSelect = 0;
    let maxSelect = opt.values.length;
    let freeSelections = 0;
    let isRequired = false;
    for (const it of assortment.items) {
      const ref = (it.options ?? []).find((r) => r.option_id === opt.id);
      if (ref) {
        const cfg = (ref as any).multi_choice_config;
        if (cfg?.total_range) {
          minSelect = cfg.total_range.min ?? 0;
          maxSelect = cfg.total_range.max ?? opt.values.length;
        }
        if (typeof cfg?.free_selections === 'number') {
          freeSelections = cfg.free_selections;
        }
        if (opt.type === 'single_choice') {
          minSelect = 1;
          maxSelect = 1;
        }
        isRequired = minSelect > 0;
        break;
      }
    }
    const { data: group, error: gErr } = await supabase
      .from('option_groups')
      .insert({
        store_id: storeId,
        name: opt.name,
        min_select: minSelect,
        max_select: Math.max(1, maxSelect),
        free_selections: freeSelections,
        is_required: isRequired,
      })
      .select()
      .single();
    if (gErr) throw gErr;
    optionGroupMap.set(opt.id, group.id);

    // Insert option values
    if (opt.values.length) {
      const rows = opt.values.map((v, idx) => ({
        store_id: storeId,
        group_id: group.id,
        name: v.name,
        price_delta: (v.price ?? 0) / 100,
        sort_order: idx + 1,
      }));
      const { data: insOpts, error: oErr } = await supabase.from('options').insert(rows).select();
      if (oErr) throw oErr;
      opt.values.forEach((v, idx) => {
        const dbId = insOpts?.[idx]?.id;
        if (dbId) optionValueMap.set(v.id, dbId);
      });
    }
  }
  console.log(`option groups: ${optionGroupMap.size}`);

  // 4. Insert categories
  const itemToCategory = new Map<string, string>(); // wolt item_id → supabase category_id
  for (let i = 0; i < assortment.categories.length; i++) {
    const cat = assortment.categories[i];
    const { data: insCat, error: cErr } = await supabase
      .from('categories')
      .insert({ store_id: storeId, name: cat.name, sort_order: i + 1 })
      .select()
      .single();
    if (cErr) throw cErr;
    for (const itemId of cat.item_ids ?? []) {
      itemToCategory.set(itemId, insCat.id);
    }
    console.log(`✓ category: ${cat.name} (${cat.item_ids?.length ?? 0} items)`);
  }

  // 5. Insert products and link option groups
  const itemById = new Map(assortment.items.map((it) => [it.id, it]));
  let prodCount = 0;
  let imgCount = 0;
  for (const cat of assortment.categories) {
    let sort = 1;
    for (const itemId of cat.item_ids ?? []) {
      const it = itemById.get(itemId);
      if (!it) continue;
      const { data: prod, error: pErr } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
          category_id: itemToCategory.get(itemId) ?? null,
          name: it.name,
          description: it.description || null,
          price: (it.price ?? 0) / 100,
          is_available: !(it.disabled_info?.is_disabled),
          sort_order: sort++,
        })
        .select()
        .single();
      if (pErr) throw pErr;
      prodCount++;

      // Link option groups for this product (dedupe — items may reference the same option twice)
      const seenGroups = new Set<string>();
      const linkRows: any[] = [];
      for (const ref of it.options ?? []) {
        const groupId = optionGroupMap.get(ref.option_id);
        if (groupId && !seenGroups.has(groupId)) {
          seenGroups.add(groupId);
          linkRows.push({ store_id: storeId, product_id: prod.id, group_id: groupId });
        }
      }
      if (linkRows.length) {
        const { error: lErr } = await supabase.from('product_option_groups').insert(linkRows);
        if (lErr) throw lErr;
      }

      // Upload image if present
      const url = it.images?.[0]?.url;
      if (url) {
        try {
          const { buf, contentType, ext } = await downloadToBuffer(url);
          const path = `stores/${storeId}/products/${prod.id}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, buf, { upsert: true, contentType });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const { error: updErr } = await supabase
            .from('products')
            .update({ image_url: pub.publicUrl })
            .eq('id', prod.id);
          if (updErr) throw updErr;
          imgCount++;
        } catch (e: any) {
          console.error(`  ✗ image for ${it.name}: ${e?.message ?? e}`);
        }
      }
    }
  }
  console.log(`\nproducts: ${prodCount}, images uploaded: ${imgCount}`);
  console.log('done. store_id =', storeId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
