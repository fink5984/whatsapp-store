/**
 * scripts/seed-schnitzelist.ts
 *
 * Seeds the entire Schnitzelist menu into the existing store named "שניצליסט".
 * Idempotent — re-running will update existing categories/products in place
 * instead of creating duplicates.
 *
 * Usage:
 *   npx tsx scripts/seed-schnitzelist.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- minimal .env.local loader ---------------------------------------------
function loadEnv(file: string) {
  try {
    const text = readFileSync(resolve(process.cwd(), file), 'utf-8');
    let key: string | null = null;
    let value = '';
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine;
      if (key !== null) {
        // continuation of multi-line quoted value
        const idx = line.indexOf('"');
        if (idx >= 0) {
          value += '\n' + line.slice(0, idx);
          process.env[key] = value;
          key = null;
          value = '';
        } else {
          value += '\n' + line;
        }
        continue;
      }
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      if (v.startsWith('"')) {
        // possibly multi-line
        v = v.slice(1);
        const closing = v.indexOf('"');
        if (closing >= 0) {
          process.env[k] = v.slice(0, closing);
        } else {
          key = k;
          value = v;
        }
      } else {
        process.env[k] = v;
      }
    }
  } catch {
    /* ignore */
  }
}
loadEnv('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STORE_NAME = 'שניצליסט';

// --------------------------- menu data ------------------------------------
const CATEGORIES = [
  'שניצל',
  'אסאדו',
  'נקניקיות וטוסט',
  'מנות ילדים',
  'נישנושים',
  'סלטים',
  'רטבים',
  'המשקאות',
];

interface Item { name: string; price: number; description?: string }
const PRODUCTS: Record<string, Item[]> = {
  'שניצל': [
    { name: 'מנת הדגל - שניצל בחלה', price: 53 },
    { name: 'שניצל בבאגט', price: 53 },
    { name: 'שניצל בלחמניה', price: 39 },
    { name: 'שניצל בצלחת + חלה וסלטים', price: 63 },
    { name: 'סלט שניצל', price: 53 },
  ],
  'אסאדו': [
    { name: 'אסאדו בחלה', price: 69 },
    { name: 'רבע ליטר אסאדו', price: 55 },
    { name: 'אסאדו בצלחת + חלה וסלטים', price: 79, description: 'מגיע עם חלה וסלטים' },
    { name: 'אסאדו בלחמניה', price: 55 },
    { name: 'סלט אסאדו', price: 69 },
  ],
  'נקניקיות וטוסט': [
    { name: 'מיקס טוסט פסטרמה', price: 47 },
    { name: 'נקניקיית בקר בלחמניה', price: 29 },
    { name: 'נקניקיית בקר חריפה בלחמניה', price: 29 },
    { name: 'נקניקיית עוף בלחמניה', price: 24 },
  ],
  'מנות ילדים': [
    { name: "מנת ילדים - נקניק עוף + צ'יפס + לחמניה", price: 29 },
    { name: "מנת ילדים - שניצלונים + צ'יפס", price: 49 },
  ],
  'נישנושים': [
    { name: 'לחמניה', price: 4 },
    { name: 'לחמניה רק עם סלטים', price: 18 },
    { name: 'נקניקיית בקר לנשנוש', price: 17 },
    { name: 'נקניקיית בקר חריפה לנשנוש', price: 17 },
    { name: 'נקניקיית עוף לנשנוש', price: 12 },
    { name: 'שניצלונים', price: 38 },
  ],
  'סלטים': [
    { name: "צ'ימיצ'ורי", price: 4, description: '80 מ"ל' },
    { name: 'קונפי שום', price: 7, description: '80 מ"ל' },
    { name: 'קוסלאו', price: 4, description: '80 מ"ל' },
    { name: 'פלפל חריף', price: 4, description: '80 מ"ל' },
  ],
  'רטבים': [
    { name: 'פסטו', price: 2 },
    { name: 'סחוג', price: 2 },
    { name: 'מיונז', price: 2 },
  ],
  'המשקאות': [
    { name: 'מים', price: 7 },
    { name: 'סודה', price: 7 },
    { name: 'פחית בלו', price: 8 },
    { name: 'פחית XL', price: 8 },
    { name: 'פחית קוקה קולה', price: 9 },
    { name: 'פחית קוקה קולה זירו', price: 9 },
    { name: 'פחית ספרינג תות בננה', price: 9 },
    { name: 'פחית ספרינג ענבים', price: 9 },
    { name: 'פחית ספרינג מנגו', price: 9 },
    { name: 'פחית ספרינג תפוחים', price: 9 },
    { name: 'פחית ספרינג תה', price: 9 },
    { name: 'פחית פאנטה אורנז', price: 9 },
    { name: 'פחית פאנטה אקזוטי', price: 9 },
    { name: 'פחית פאנטה תות', price: 9 },
    { name: 'פחית ספרייט', price: 9 },
    { name: 'פחית פפסי', price: 9 },
    { name: 'פחית פפסי מקס', price: 9 },
  ],
};

// Option groups (also populated dynamically from "סלטים" and "רטבים")
const OPTION_GROUPS = [
  {
    name: 'סלטים נוספים',
    description: 'בחירת סלטים להוספה למנה',
    min_select: 0,
    max_select: 4,
    is_required: false,
    options: PRODUCTS['סלטים'].map((p) => ({ name: p.name, price_delta: p.price })),
  },
  {
    name: 'רטבים',
    description: 'בחירת רטבים להוספה',
    min_select: 0,
    max_select: 3,
    is_required: false,
    options: PRODUCTS['רטבים'].map((p) => ({ name: p.name, price_delta: p.price })),
  },
];

// Categories whose products should get attached option groups
const CATEGORIES_WITH_ADDONS = ['שניצל', 'אסאדו', 'נקניקיות וטוסט', 'מנות ילדים'];

// --------------------------- main ----------------------------------------
async function main() {
  // 1. find the store by name
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id, name, slug')
    .eq('name', STORE_NAME)
    .maybeSingle();
  if (storeErr) throw storeErr;
  if (!store) {
    console.error(`לא נמצאה חנות בשם "${STORE_NAME}". צור אותה דרך /admin/stores/new קודם.`);
    process.exit(1);
  }
  console.log(`found store: ${store.name} (${store.id})`);

  const storeId = store.id as string;

  // 2. categories — upsert by (store_id, name)
  const categoryByName = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      categoryByName.set(name, existing.id);
      await supabase
        .from('categories')
        .update({ sort_order: i + 1, is_active: true })
        .eq('id', existing.id);
      console.log(`  category exists: ${name}`);
    } else {
      const { data: created, error } = await supabase
        .from('categories')
        .insert({
          store_id: storeId,
          name,
          sort_order: i + 1,
          is_active: true,
        })
        .select('id')
        .single();
      if (error) throw error;
      categoryByName.set(name, created.id);
      console.log(`  + category: ${name}`);
    }
  }

  // 3. products — upsert by (store_id, name)
  const productByName = new Map<string, string>();
  for (const [catName, items] of Object.entries(PRODUCTS)) {
    const categoryId = categoryByName.get(catName);
    if (!categoryId) continue;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('name', item.name)
        .maybeSingle();

      const payload = {
        store_id: storeId,
        category_id: categoryId,
        name: item.name,
        description: item.description ?? null,
        price: item.price,
        sort_order: i + 1,
        is_active: true,
        is_available: true,
      };

      if (existing) {
        await supabase.from('products').update(payload).eq('id', existing.id);
        productByName.set(item.name, existing.id);
        console.log(`  product updated: ${item.name}`);
      } else {
        const { data: created, error } = await supabase
          .from('products')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        productByName.set(item.name, created.id);
        console.log(`  + product: ${item.name} (₪${item.price})`);
      }
    }
  }

  // 4. option groups + options
  const groupByName = new Map<string, string>();
  for (let gi = 0; gi < OPTION_GROUPS.length; gi++) {
    const g = OPTION_GROUPS[gi];
    const { data: existingGroup } = await supabase
      .from('option_groups')
      .select('id')
      .eq('store_id', storeId)
      .eq('name', g.name)
      .maybeSingle();

    let groupId: string;
    const groupPayload = {
      store_id: storeId,
      name: g.name,
      description: g.description,
      min_select: g.min_select,
      max_select: g.max_select,
      is_required: g.is_required,
      is_active: true,
      sort_order: gi + 1,
    };

    if (existingGroup) {
      groupId = existingGroup.id;
      await supabase.from('option_groups').update(groupPayload).eq('id', groupId);
      console.log(`  group updated: ${g.name}`);
    } else {
      const { data: created, error } = await supabase
        .from('option_groups')
        .insert(groupPayload)
        .select('id')
        .single();
      if (error) throw error;
      groupId = created.id;
      console.log(`  + group: ${g.name}`);
    }
    groupByName.set(g.name, groupId);

    for (let oi = 0; oi < g.options.length; oi++) {
      const opt = g.options[oi];
      const { data: existingOpt } = await supabase
        .from('options')
        .select('id')
        .eq('store_id', storeId)
        .eq('group_id', groupId)
        .eq('name', opt.name)
        .maybeSingle();

      const optPayload = {
        store_id: storeId,
        group_id: groupId,
        name: opt.name,
        price_delta: opt.price_delta,
        is_active: true,
        sort_order: oi + 1,
      };
      if (existingOpt) {
        await supabase.from('options').update(optPayload).eq('id', existingOpt.id);
      } else {
        await supabase.from('options').insert(optPayload);
        console.log(`     · option: ${opt.name} (+₪${opt.price_delta})`);
      }
    }
  }

  // 5. attach option groups to products in CATEGORIES_WITH_ADDONS
  const targetProductIds: string[] = [];
  for (const catName of CATEGORIES_WITH_ADDONS) {
    for (const item of PRODUCTS[catName] ?? []) {
      const pid = productByName.get(item.name);
      if (pid) targetProductIds.push(pid);
    }
  }

  for (const groupName of ['סלטים נוספים', 'רטבים']) {
    const groupId = groupByName.get(groupName);
    if (!groupId) continue;
    for (const productId of targetProductIds) {
      const { data: linked } = await supabase
        .from('product_option_groups')
        .select('id')
        .eq('product_id', productId)
        .eq('group_id', groupId)
        .maybeSingle();
      if (!linked) {
        await supabase.from('product_option_groups').insert({
          store_id: storeId,
          product_id: productId,
          group_id: groupId,
        });
      }
    }
    console.log(`  linked group "${groupName}" to ${targetProductIds.length} products`);
  }

  console.log('\n✓ done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
