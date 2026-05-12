import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { SettingsTabs } from '@/components/admin/SettingsTabs';

export const dynamic = 'force-dynamic';

export default async function StoreSettingsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();

  const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  const { data: hoursRaw } = await supabase
    .from('store_opening_hours')
    .select('*')
    .eq('store_id', storeId)
    .order('day_of_week');

  // ensure 7 rows, day 0..6 — fill missing
  const hours = Array.from({ length: 7 }, (_, d) => {
    const found = (hoursRaw ?? []).find((h) => h.day_of_week === d);
    return (
      found ?? {
        id: '',
        store_id: storeId,
        day_of_week: d,
        open_time: '09:00',
        close_time: '21:00',
        is_closed: false,
      }
    );
  });

  const { data: notifications } = await supabase
    .from('store_notifications')
    .select('*')
    .eq('store_id', storeId);

  return <SettingsTabs store={store} hours={hours} notifications={notifications ?? []} />;
}
