import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { CategoriesManager } from '@/components/admin/CategoryForm';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();

  const [{ data: store }, { data: categories }, { data: productCounts }] = await Promise.all([
    supabase.from('stores').select('id, name').eq('id', storeId).maybeSingle(),
    supabase.from('categories').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('products').select('category_id').eq('store_id', storeId),
  ]);

  if (!store) notFound();

  const counts = new Map<string, number>();
  for (const row of (productCounts ?? []) as { category_id: string | null }[]) {
    if (!row.category_id) continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  const categoriesWithCount = (categories ?? []).map((c) => ({
    ...c,
    product_count: counts.get(c.id) ?? 0,
  }));

  return <CategoriesManager storeId={storeId} initial={categoriesWithCount} />;
}
