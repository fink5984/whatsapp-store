import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ storeId: string; productId: string }>;
}) {
  const { storeId, productId } = await params;
  const { supabase } = await requireUser();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (!product) notFound();

  const [{ data: categories }, { data: groups }, { data: options }, { data: links }] = await Promise.all([
    supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('option_groups').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('options').select('group_id').eq('store_id', storeId),
    supabase.from('product_option_groups').select('group_id').eq('product_id', productId),
  ]);

  const counts = new Map<string, number>();
  for (const o of (options ?? []) as { group_id: string }[]) {
    counts.set(o.group_id, (counts.get(o.group_id) ?? 0) + 1);
  }
  const groupsWithCount = (groups ?? []).map((g) => ({ ...g, option_count: counts.get(g.id) ?? 0 }));
  const linkedIds = ((links ?? []) as { group_id: string }[]).map((l) => l.group_id);

  return (
    <ProductForm
      storeId={storeId}
      product={product}
      categories={categories ?? []}
      optionGroups={groupsWithCount}
      linkedGroupIds={linkedIds}
    />
  );
}
