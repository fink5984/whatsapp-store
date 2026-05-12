import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { formatCurrencyILS } from '@/lib/pricing';
import { formatTime, initials } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StoreHomePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  const { supabase } = await requireUser();
  const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
  if (!store) notFound();

  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', start.toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('products').select('*').eq('store_id', storeId),
  ]);

  const todayOrders = orders ?? [];
  const allProducts = products ?? [];
  const unavailable = allProducts.filter((p) => !p.is_available);
  const revenue = todayOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0);

  return (
    <>
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="store-avatar store-avatar--xl">{initials(store.name)}</div>
          <div>
            <div className="page-head-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {store.name}
              {store.is_active ? <Badge variant="success" dot>פעיל</Badge> : <Badge variant="warn" dot>לא פעיל</Badge>}
            </div>
            <div className="page-head-sub">{store.description}</div>
          </div>
        </div>
        <div className="page-head-actions">
          <Link href={`/admin/stores/${storeId}/settings`}>
            <Button variant="secondary">הגדרות</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ marginBottom: 24 }}>
        <Stat label="הזמנות היום" value={`${todayOrders.length}`} />
        <Stat label="הכנסות היום" value={formatCurrencyILS(revenue)} />
        <Stat label="מוצרים פעילים" value={`${allProducts.filter((p) => p.is_active).length}`} sub={`${unavailable.length} לא זמינים`} />
        <Stat label="זמן הכנה" value={`${store.estimated_preparation_minutes} דק׳`} />
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <Card title="הזמנות אחרונות" flush
          action={<Link href={`/admin/stores/${storeId}/orders`}><Button variant="ghost" size="sm">צפה בהכל →</Button></Link>}>
          {todayOrders.length === 0 ? (
            <Empty title="אין הזמנות היום" body="ההזמנות יופיעו כאן ברגע שיתקבלו" />
          ) : (
            <table className="table table--clickable">
              <thead>
                <tr><th>#</th><th>לקוח</th><th>סוג</th><th>סכום</th><th>סטטוס</th><th>זמן</th></tr>
              </thead>
              <tbody>
                {todayOrders.slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td className="cell-strong mono">
                      <Link href={`/admin/stores/${storeId}/orders/${o.id}`}>#{o.order_number}</Link>
                    </td>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="קיצורי דרך">
            <div className="grid gap-2 grid-cols-2">
              <Shortcut href={`/admin/stores/${storeId}/products`} label="מוצרים" />
              <Shortcut href={`/admin/stores/${storeId}/categories`} label="קטגוריות" />
              <Shortcut href={`/admin/stores/${storeId}/options`} label="תוספות" />
              <Shortcut href={`/admin/stores/${storeId}/delivery`} label="אזורי משלוח" />
              <Shortcut href={`/admin/stores/${storeId}/orders`} label="הזמנות" />
              <Shortcut href={`/admin/stores/${storeId}/settings`} label="הגדרות Flow" />
            </div>
          </Card>

          {unavailable.length > 0 && (
            <Card title="מוצרים לא זמינים" sub="מוצגים אבל לא ניתנים להזמנה">
              {unavailable.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--divider)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-subtle)' }}>{formatCurrencyILS(Number(p.price))}</div>
                  </div>
                  <Link href={`/admin/stores/${storeId}/products/${p.id}`}>
                    <Button variant="ghost" size="sm">פתח</Button>
                  </Link>
                </div>
              ))}
            </Card>
          )}
        </div>
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

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}
