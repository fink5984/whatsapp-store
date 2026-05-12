import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { formatCurrencyILS } from '@/lib/pricing';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_TABS = [
  { key: 'all', label: 'הכל' },
  { key: 'new', label: 'חדשות' },
  { key: 'preparing', label: 'בהכנה' },
  { key: 'ready', label: 'מוכנות' },
  { key: 'out', label: 'במשלוח' },
  { key: 'completed', label: 'הושלמו' },
  { key: 'cancelled', label: 'בוטלו' },
];

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { storeId } = await params;
  const { status } = await searchParams;
  const { supabase } = await requireUser();

  const { data: store } = await supabase.from('stores').select('id, name').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  let query = supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, city, delivery_type, total, status, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);

  const { data: orders } = await query;

  const counts: Record<string, number> = { all: 0 };
  const { data: allOrders } = await supabase.from('orders').select('status').eq('store_id', storeId);
  for (const row of (allOrders ?? []) as { status: string }[]) {
    counts.all++;
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">הזמנות</div>
          <div className="page-head-sub">
            {counts.all ?? 0} הזמנות · {counts.new ?? 0} ממתינות לטיפול
          </div>
        </div>
      </div>

      <div className="tabs">
        {STATUS_TABS.map((t) => {
          const cur = status ?? 'all';
          return (
            <Link
              key={t.key}
              href={t.key === 'all' ? `/admin/stores/${storeId}/orders` : `/admin/stores/${storeId}/orders?status=${t.key}`}
              className="tab"
              data-active={cur === t.key ? 'true' : 'false'}
            >
              {t.label} <Badge>{counts[t.key] ?? 0}</Badge>
            </Link>
          );
        })}
      </div>

      <Card flush>
        {(orders ?? []).length === 0 ? (
          <Empty title="אין הזמנות בסטטוס הזה" />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr><th>הזמנה</th><th>זמן</th><th>לקוח</th><th>עיר</th><th>סוג</th><th>סכום</th><th>סטטוס</th></tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="cell-strong mono">
                    <Link href={`/admin/stores/${storeId}/orders/${o.id}`}>#{o.order_number}</Link>
                  </td>
                  <td className="cell-muted mono">{formatDateTime(o.created_at)}</td>
                  <td>
                    <div className="cell-strong">{o.customer_name ?? '—'}</div>
                    <div className="cell-muted">{o.customer_phone ?? ''}</div>
                  </td>
                  <td>{o.city ?? '—'}</td>
                  <td>
                    {o.delivery_type === 'delivery' ? <Badge variant="info" dot>משלוח</Badge> : <Badge dot>איסוף</Badge>}
                  </td>
                  <td className="cell-strong mono">{formatCurrencyILS(Number(o.total))}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
