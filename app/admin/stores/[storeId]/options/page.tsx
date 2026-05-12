import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { OptionGroupsManager } from '@/components/admin/OptionGroupsManager';

export const dynamic = 'force-dynamic';

export default async function OptionsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();

  const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  const [{ data: groups }, { data: options }] = await Promise.all([
    supabase.from('option_groups').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('options').select('*').eq('store_id', storeId).order('sort_order'),
  ]);

  const groupsWithOptions = (groups ?? []).map((g) => ({
    ...g,
    options: (options ?? []).filter((o) => o.group_id === g.id),
  }));

  return <OptionGroupsManager storeId={storeId} initial={groupsWithOptions} />;
}
