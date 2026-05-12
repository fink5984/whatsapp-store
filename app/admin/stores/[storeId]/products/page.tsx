import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { formatCurrencyILS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function ProductsListPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { supabase } = await requireUser();

  const [{ data: store }, { data: products }, { data: categories }] = await Promise.all([
    supabase.from('stores').select('id, name').eq('id', storeId).maybeSingle(),
    supabase.from('products').select('*').eq('store_id', storeId).order('sort_order'),
    supabase.from('categories').select('id, name').eq('store_id', storeId),
  ]);

  if (!store) notFound();

  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const allProducts = products ?? [];
  const availableCount = allProducts.filter((p) => p.is_available && p.is_active).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title">מוצרים</div>
          <div className="page-head-sub">
            {allProducts.length} מוצרים · {availableCount} זמינים להזמנה
          </div>
        </div>
        <div className="page-head-actions">
          <Link href={`/admin/stores/${storeId}/products/new`}>
            <Button variant="primary">+ מוצר חדש</Button>
          </Link>
        </div>
      </div>

      <Card flush>
        {allProducts.length === 0 ? (
          <Empty title="אין מוצרים" body="הוסף את המוצר הראשון לתפריט" action={
            <Link href={`/admin/stores/${storeId}/products/new`}>
              <Button variant="primary">+ מוצר חדש</Button>
            </Link>
          } />
        ) : (
          <table className="table table--clickable">
            <thead>
              <tr>
                <th style={{ width: 64 }}></th>
                <th>שם</th>
                <th>קטגוריה</th>
                <th>מחיר</th>
                <th>Badge</th>
                <th>זמין</th>
                <th>פעיל</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt=""
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 'var(--r-sm)',
                          background: 'var(--surface-2)',
                          border: '1px dashed var(--border-strong)',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'var(--text-subtle)',
                          fontSize: 11,
                        }}
                      >
                        ⌂
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="cell-strong">
                      <Link href={`/admin/stores/${storeId}/products/${p.id}`}>{p.name}</Link>
                    </div>
                    <div className="cell-muted">{p.description ?? '—'}</div>
                  </td>
                  <td>{p.category_id ? catMap.get(p.category_id) ?? '—' : '—'}</td>
                  <td className="cell-strong mono">{formatCurrencyILS(Number(p.price))}</td>
                  <td>{p.badge ? <Badge>{p.badge}</Badge> : <span className="cell-muted">—</span>}</td>
                  <td>{p.is_available ? <Badge variant="success" dot>זמין</Badge> : <Badge variant="warn" dot>לא זמין</Badge>}</td>
                  <td>{p.is_active ? <Badge variant="success" dot>פעיל</Badge> : <Badge dot>מוסתר</Badge>}</td>
                  <td>
                    <Link href={`/admin/stores/${storeId}/products/${p.id}`}>
                      <Button variant="ghost" size="sm">עריכה</Button>
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
