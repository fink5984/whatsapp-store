import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { OrderDetails } from '@/components/admin/OrderDetails';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ storeId: string; orderId: string }>;
}) {
  const { storeId, orderId } = await params;
  const { supabase } = await requireUser();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*, options:order_item_options(*)')
    .eq('order_id', orderId);

  return <OrderDetails storeId={storeId} order={order} items={items ?? []} />;
}
