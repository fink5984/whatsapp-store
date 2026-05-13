/**
 * Re-reads scripts/wolt-categories.json, computes free_selections / min /
 * max / is_required for each option group referenced there, and updates the
 * matching rows in `option_groups` of the existing shnitzka store by name.
 *
 * Safe to re-run.
 *   npx tsx --env-file=.env.local scripts/backfill-shnitzka-free-selections.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SLUG = 'shnitzka';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type WoltOption = { id: string; name: string; type: string; values: { id: string; price: number }[] };
type WoltItemOptRef = {
  id: string;
  option_id: string;
  multi_choice_config?: {
    total_range?: { min?: number; max?: number };
    free_selections?: number;
  };
};
type WoltItem = { id: string; name: string; options?: WoltItemOptRef[] };

async function main() {
  const data = JSON.parse(
    readFileSync(join(__dirname, 'wolt-categories.json'), 'utf8'),
  ) as { options: WoltOption[]; items: WoltItem[] };

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', SLUG)
    .single();
  if (!store) throw new Error(`store ${SLUG} not found`);
  const storeId = store.id;
  console.log('store:', storeId);

  // Compute the desired config for each option by name
  type Desired = { min: number; max: number; free: number; required: boolean };
  const byName = new Map<string, Desired>();
  for (const opt of data.options) {
    let min = 0;
    let max = opt.values.length;
    let free = 0;
    let isRequired = false;
    for (const it of data.items) {
      const ref = (it.options ?? []).find((r) => r.option_id === opt.id);
      if (ref) {
        const cfg = ref.multi_choice_config;
        if (cfg?.total_range) {
          min = cfg.total_range.min ?? 0;
          max = cfg.total_range.max ?? opt.values.length;
        }
        if (typeof cfg?.free_selections === 'number') free = cfg.free_selections;
        if (opt.type === 'single_choice') { min = 1; max = 1; }
        isRequired = min > 0;
        break;
      }
    }
    byName.set(opt.name, { min, max: Math.max(1, max), free, required: isRequired });
  }

  const { data: groups } = await supabase
    .from('option_groups')
    .select('id, name, min_select, max_select, free_selections, is_required')
    .eq('store_id', storeId);
  console.log('groups in DB:', groups?.length);

  let updated = 0;
  let skipped: string[] = [];
  for (const g of groups ?? []) {
    const d = byName.get(g.name);
    if (!d) { skipped.push(g.name); continue; }
    const needs =
      g.min_select !== d.min ||
      g.max_select !== d.max ||
      g.free_selections !== d.free ||
      g.is_required !== d.required;
    if (!needs) continue;
    const { error } = await supabase
      .from('option_groups')
      .update({
        min_select: d.min,
        max_select: d.max,
        free_selections: d.free,
        is_required: d.required,
      })
      .eq('id', g.id);
    if (error) { console.error('update failed for', g.name, error); continue; }
    updated++;
    console.log(
      `✓ ${g.name}: min=${d.min} max=${d.max} free=${d.free} required=${d.required}`,
    );
  }
  console.log('\nupdated:', updated);
  if (skipped.length) console.log('no Wolt match for:', skipped);
}

main().catch((e) => { console.error(e); process.exit(1); });
