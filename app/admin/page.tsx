import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { formatCurrencyILS } from '@/lib/pricing';
import { formatTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: stores }, { data: todayOrders }, { count: productsCount }] = await Promise.all([
    supabase.from('stores').select('*'),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, delivery_type, total, status, store_id, created_at')
      .gte('created_at', startOfToday.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
  ]);

  const storeMap = new Map((stores ?? []).map((s) => [s.id as string, s]));
  const activeStores = (stores ?? []).filter((s) => s.is_active).length;
  const revenue = (todayOrders ?? [])
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">סקירה כללית</div>
          <div className="page-head-sub">נתוני כל החנויות שלך, היום</div>
        </div>
        <div className="page-head-actions">
          <Link href="/admin/stores/new">
            <Button variant="primary">+ חנות חדשה</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ marginBottom: 24 }}>
        <Stat label="חנויות פעילות" value={`${activeStores}`} sub={`${(stores ?? []).length} סה״כ`} />
        <Stat label="הזמנות היום" value={`${(todayOrders ?? []).length}`} />
        <Stat label="הכנסות היום" value={formatCurrencyILS(revenue)} />
        <Stat label="סך מוצרים" value={`${productsCount ?? 0}`} />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <Card title="הזמנות אחרונות" sub="מכל החנויות" flush>
          {(todayOrders ?? []).length === 0 ? (
            <Empty title="אין עדיין הזמנות היום" body="ההזמנות יופיעו כאן ברגע שיתקבלו דרך WhatsApp Flow" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>חנות</th>
                  <th>לקוח</th>
                  <th>סוג</th>
                  <th>סכום</th>
                  <th>סטטוס</th>
                  <th>זמן</th>
                </tr>
              </thead>
              <tbody>
                {(todayOrders ?? []).slice(0, 10).map((o) => (
                  <tr key={o.id}>
                    <td className="cell-strong mono">#{o.order_number}</td>
                    <td>{storeMap.get(o.store_id as string)?.name ?? '—'}</td>
                    <td>
                      <div className="cell-strong">{o.customer_name ?? '—'}</div>
                      <div className="cell-muted">{o.customer_phone ?? ''}</div>
                    </td>
                    <td>{o.delivery_type === 'delivery' ? 'משלוח' : 'איסוף'}</td>
                    <td className="cell-strong mono">{formatCurrencyILS(Number(o.total))}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="cell-muted mono">{formatTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="חנויות" sub="לחץ לכניסה">
          {(stores ?? []).length === 0 ? (
            <Empty
              title="עוד אין חנויות"
              body="צור את החנות הראשונה שלך כדי להתחיל"
              action={
                <Link href="/admin/stores/new">
                  <Button variant="primary">+ חנות חדשה</Button>
                </Link>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(stores ?? []).map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/stores/${s.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    border: '1px solid var(--divider)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <div className="store-avatar">{(s.name || '?').slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{s.city ?? ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-delta">{sub}</div>}
    </div>
  );
}
