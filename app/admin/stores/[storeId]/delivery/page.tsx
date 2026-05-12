import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { DeliveryZonesManager } from '@/components/admin/DeliveryZonesManager';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();

  const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  const { data: zones } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('store_id', storeId)
    .order('city');

  return <DeliveryZonesManager storeId={storeId} initial={zones ?? []} />;
}
