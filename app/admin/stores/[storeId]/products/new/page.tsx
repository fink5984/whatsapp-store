import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();
  const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  const [{ data: categories }, { data: groups }, { data: options }] = await Promise.all([
    supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('option_groups').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('options').select('group_id').eq('store_id', storeId),
  ]);

  const counts = new Map<string, number>();
  for (const o of (options ?? []) as { group_id: string }[]) {
    counts.set(o.group_id, (counts.get(o.group_id) ?? 0) + 1);
  }
  const groupsWithCount = (groups ?? []).map((g) => ({ ...g, option_count: counts.get(g.id) ?? 0 }));

  return (
    <ProductForm
      storeId={storeId}
      product={null}
      categories={categories ?? []}
      optionGroups={groupsWithCount}
      linkedGroupIds={[]}
    />
  );
}
