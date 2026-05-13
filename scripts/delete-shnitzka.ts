import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function main() {
  const { data: stores } = await supabase.from('stores').select('id, name, slug').eq('slug', 'shnitzka');
  if (!stores?.length) { console.log('no shnitzka store found'); return; }
  for (const s of stores) {
    console.log('deleting store', s.id, s.name);
    await supabase.from('product_option_groups').delete().eq('store_id', s.id);
    await supabase.from('options').delete().eq('store_id', s.id);
    await supabase.from('option_groups').delete().eq('store_id', s.id);
    await supabase.from('products').delete().eq('store_id', s.id);
    await supabase.from('categories').delete().eq('store_id', s.id);
    await supabase.from('stores').delete().eq('id', s.id);
    console.log('deleted');
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
