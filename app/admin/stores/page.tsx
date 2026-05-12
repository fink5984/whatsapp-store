import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { initials } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StoresPage() {
  const { supabase } = await requireUser();

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false });

  const ids = (stores ?? []).map((s) => s.id);
  const [{ data: productCounts }, { data: ordersToday }] = await Promise.all([
    ids.length
      ? supabase.from('products').select('store_id').in('store_id', ids)
      : Promise.resolve({ data: [] as { store_id: string }[] }),
    (() => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return ids.length
        ? supabase
            .from('orders')
            .select('store_id')
            .in('store_id', ids)
            .gte('created_at', start.toISOString())
        : Promise.resolve({ data: [] as { store_id: string }[] });
    })(),
  ]);

  const productByStore = new Map<string, number>();
  for (const row of (productCounts ?? []) as { store_id: string }[]) {
    productByStore.set(row.store_id, (productByStore.get(row.store_id) ?? 0) + 1);
  }
  const ordersByStore = new Map<string, number>();
  for (const row of (ordersToday ?? []) as { store_id: string }[]) {
    ordersByStore.set(row.store_id, (ordersByStore.get(row.store_id) ?? 0) + 1);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">כל החנויות</div>
          <div className="page-head-sub">
            {(stores ?? []).length} חנויות במערכת · {(stores ?? []).filter((s) => s.is_active).length} פעילות
          </div>
        </div>
        <div className="page-head-actions">
          <Link href="/admin/stores/new">
            <Button variant="primary">+ חנות חדשה</Button>
          </Link>
        </div>
      </div>

      <Card flush>
        {(stores ?? []).length === 0 ? (
          <Empty
            title="עוד אין חנויות"
            body="חנות חדשה תיצור את הסביבה לקטגוריות, מוצרים, תוספות, אזורי משלוח והזמנות"
            action={
              <Link href="/admin/stores/new">
                <Button variant="primary">+ חנות חדשה</Button>
              </Link>
            }
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>שם חנות</th>
                <th>עיר</th>
                <th>קטגוריה</th>
                <th>קוד</th>
                <th>מוצרים</th>
                <th>הזמנות היום</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(stores ?? []).map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="store-avatar">{initials(s.name)}</div>
                  </td>
                  <td>
                    <div className="cell-strong">
                      <Link href={`/admin/stores/${s.id}`}>{s.name}</Link>
                    </div>
                    <div className="cell-muted">{s.slug}</div>
                  </td>
                  <td>{s.city ?? '—'}</td>
                  <td>{s.category ?? '—'}</td>
                  <td className="mono cell-muted">{s.store_code ?? '—'}</td>
                  <td className="cell-strong">{productByStore.get(s.id) ?? 0}</td>
                  <td className="cell-strong">{ordersByStore.get(s.id) ?? 0}</td>
                  <td>
                    {s.is_active ? (
                      <Badge variant="success" dot>פעיל</Badge>
                    ) : (
                      <Badge variant="warn" dot>לא פעיל</Badge>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/stores/${s.id}`}>
                      <Button variant="ghost" size="sm">פתח</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
