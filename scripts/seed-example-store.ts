/**
 * scripts/seed-example-store.ts
 *
 * Inserts ONE example store with categories, products, options and a delivery
 * zone — useful for E2E testing the admin UI and the WhatsApp Flow endpoint.
 *
 * Usage:
 *   npm run seed -- --owner-email you@example.com
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * This script is NEVER imported by the app. Run it manually only.
 */

import { createClient } from '@supabase/supabase-js';

const ownerEmailArg = process.argv.find((a) => a.startsWith('--owner-email='));
const ownerEmail = ownerEmailArg?.split('=')[1];
if (!ownerEmail) {
  console.error('usage: npm run seed -- --owner-email=you@example.com');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function findUserId(email: string): Promise<string> {
  const { data } = await supabase.auth.admin.listUsers();
  const found = data.users.find((u) => u.email === email);
  if (!found) throw new Error(`לא נמצא משתמש לאימייל ${email}. צור אותו תחילה ב־/login`);
  return found.id;
}

async function main() {
  const ownerId = await findUserId(ownerEmail!);
  console.log('owner_id:', ownerId);

  // Make sure profile exists
  await supabase.from('profiles').upsert({ id: ownerId, full_name: 'Demo Owner' }, { onConflict: 'id' });

  // Store
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .insert({
      owner_id: ownerId,
      name: 'פיצה נאפולי לדוגמה',
      slug: 'napoli-demo',
      store_code: 'NAPL',
      description: 'פיצריה איטלקית עם בצק מותפח 48 שעות',
      city: 'תל אביב',
      address: 'דיזנגוף 100',
      category: 'פיצריה',
      kosher_type: 'כשר',
      minimum_order: 50,
      default_delivery_fee: 18,
      estimated_preparation_minutes: 25,
    })
    .select()
    .single();
  if (storeErr) throw storeErr;
  console.log('created store', store.id);

  // Categories
  const { data: categories } = await supabase
    .from('categories')
    .insert([
      { store_id: store.id, name: 'פיצות', sort_order: 1 },
      { store_id: store.id, name: 'תוספות', sort_order: 2 },
      { store_id: store.id, name: 'שתיה', sort_order: 3 },
    ])
    .select();

  const pizzaCat = categories?.find((c) => c.name === 'פיצות');
  const drinkCat = categories?.find((c) => c.name === 'שתיה');

  // Products
  const { data: products } = await supabase
    .from('products')
    .insert([
      {
        store_id: store.id,
        category_id: pizzaCat?.id,
        name: 'פיצה מרגריטה',
        description: 'רוטב עגבניות, מוצרלה ובזיליקום',
        price: 58,
        sort_order: 1,
      },
      {
        store_id: store.id,
        category_id: pizzaCat?.id,
        name: 'פיצה פפרוני',
        description: 'פפרוני חריף וגבינת מוצרלה',
        price: 68,
        sort_order: 2,
      },
      {
        store_id: store.id,
        category_id: drinkCat?.id,
        name: 'לימונדה',
        price: 14,
        sort_order: 1,
      },
    ])
    .select();
  console.log('created products', products?.length);

  // Option groups + options
  const { data: sizeGroup } = await supabase
    .from('option_groups')
    .insert({ store_id: store.id, name: 'גודל', min_select: 1, max_select: 1, is_required: true })
    .select()
    .single();

  const { data: toppingGroup } = await supabase
    .from('option_groups')
    .insert({ store_id: store.id, name: 'תוספות', min_select: 0, max_select: 5 })
    .select()
    .single();

  if (sizeGroup) {
    await supabase.from('options').insert([
      { store_id: store.id, group_id: sizeGroup.id, name: 'S', price_delta: 0 },
      { store_id: store.id, group_id: sizeGroup.id, name: 'M', price_delta: 8 },
      { store_id: store.id, group_id: sizeGroup.id, name: 'L', price_delta: 14 },
    ]);
  }
  if (toppingGroup) {
    await supabase.from('options').insert([
      { store_id: store.id, group_id: toppingGroup.id, name: 'פטריות', price_delta: 6 },
      { store_id: store.id, group_id: toppingGroup.id, name: 'זיתים', price_delta: 6 },
      { store_id: store.id, group_id: toppingGroup.id, name: 'בצל', price_delta: 4 },
    ]);
  }

  // Link option groups to the pizza products
  const pizzaIds = (products ?? []).filter((p) => p.category_id === pizzaCat?.id).map((p) => p.id);
  for (const productId of pizzaIds) {
    if (sizeGroup) await supabase.from('product_option_groups').insert({ store_id: store.id, product_id: productId, group_id: sizeGroup.id });
    if (toppingGroup) await supabase.from('product_option_groups').insert({ store_id: store.id, product_id: productId, group_id: toppingGroup.id });
  }

  // Delivery zone
  await supabase.from('delivery_zones').insert({
    store_id: store.id,
    city: 'תל אביב',
    area_name: 'מרכז',
    delivery_fee: 18,
    minimum_order: 50,
    estimated_minutes: 35,
  });

  console.log('done — open /admin to manage the seeded store');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
