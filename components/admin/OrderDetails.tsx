'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge, StatusBadge, STATUS_LABELS } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toaster';
import { formatCurrencyILS } from '@/lib/pricing';
import { formatDateTime } from '@/lib/utils';
import type { Order, OrderItem, OrderItemOption } from '@/lib/supabase/database.types';

interface FullItem extends OrderItem {
  options: OrderItemOption[];
}

const STATUS_ORDER: { key: string; label: string }[] = [
  { key: 'new', label: STATUS_LABELS.new.text },
  { key: 'preparing', label: STATUS_LABELS.preparing.text },
  { key: 'ready', label: STATUS_LABELS.ready.text },
  { key: 'out', label: STATUS_LABELS.out.text },
  { key: 'completed', label: STATUS_LABELS.completed.text },
  { key: 'cancelled', label: STATUS_LABELS.cancelled.text },
];

export function OrderDetails({
  storeId,
  order: initial,
  items,
}: {
  storeId: string;
  order: Order;
  items: FullItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = React.useState(initial);

  const setStatus = async (status: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: order.id, status }),
    });
    if (!res.ok) {
      toast('שגיאה בעדכון סטטוס', 'error');
      return;
    }
    setOrder((o) => ({ ...o, status: status as Order['status'] }));
    toast(`סטטוס עודכן ל"${STATUS_ORDER.find((s) => s.key === status)?.label}"`);
    router.refresh();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-head-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            הזמנה #{order.order_number}
            <StatusBadge status={order.status} />
          </div>
          <div className="page-head-sub">
            התקבלה ב־{formatDateTime(order.created_at)} · {order.delivery_type === 'delivery' ? 'משלוח' : 'איסוף עצמי'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-[2fr_1fr]">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="סטטוס ההזמנה">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s.key}
                  className={`btn btn--sm ${order.status === s.key ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setStatus(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Card>

          <Card title="פריטי ההזמנה" flush>
            <div style={{ padding: 20 }}>
              {items.map((it, i) => (
                <div
                  key={it.id}
                  style={{
                    paddingBottom: 16,
                    marginBottom: 16,
                    borderBottom: i < items.length - 1 ? '1px dashed var(--divider)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {it.quantity} × {it.product_name}
                      </div>
                      {it.options?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {it.options.map((opt) => (
                            <div key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                              <span>
                                <span style={{ color: 'var(--text-subtle)' }}>{opt.group_name}:</span> {opt.option_name}
                              </span>
                              {Number(opt.price_delta) > 0 && (
                                <span className="mono">+ {formatCurrencyILS(Number(opt.price_delta))}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {it.note && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          הערה: {it.note}
                        </div>
                      )}
                    </div>
                    <div className="mono" style={{ fontWeight: 500 }}>{formatCurrencyILS(Number(it.total_price))}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, background: 'var(--surface-2)', borderTop: '1px solid var(--divider)' }}>
              <SummaryRow label="סכום ביניים" value={formatCurrencyILS(Number(order.subtotal))} />
              {order.delivery_type === 'delivery' && (
                <SummaryRow label="דמי משלוח" value={formatCurrencyILS(Number(order.delivery_fee))} />
              )}
              {Number(order.discount) > 0 && (
                <SummaryRow label="הנחה" value={`-${formatCurrencyILS(Number(order.discount))}`} />
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0 0',
                  fontSize: 15,
                  fontWeight: 600,
                  borderTop: '1px solid var(--divider)',
                  marginTop: 6,
                }}
              >
                <span>סך הכל</span>
                <span className="mono">{formatCurrencyILS(Number(order.total))}</span>
              </div>
            </div>
          </Card>

          {order.customer_note && (
            <Card title="הערת לקוח">
              <div className="muted" style={{ fontSize: 13, fontStyle: 'italic' }}>"{order.customer_note}"</div>
            </Card>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="לקוח">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <div className="cell-strong">{order.customer_name ?? '—'}</div>
              <div className="mono">{order.customer_phone ?? '—'}</div>
              {order.customer_email && <div>{order.customer_email}</div>}
            </div>
          </Card>

          {order.delivery_type === 'delivery' && (
            <Card title="כתובת משלוח">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                {order.address && <div>{order.address}</div>}
                {order.city && <div className="cell-muted">{order.city}</div>}
                {(order.floor || order.apartment) && (
                  <div className="cell-muted">
                    {order.floor && `קומה ${order.floor}`} {order.apartment && `· דירה ${order.apartment}`}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="תשלום">
            <SummaryRow label="שיטה" value={order.payment_method ?? 'לא צוין'} />
            <SummaryRow
              label="סטטוס"
              value={
                order.payment_status === 'paid' ? (
                  <Badge variant="success" dot>שולם</Badge>
                ) : order.payment_status === 'refunded' ? (
                  <Badge variant="warn" dot>הוחזר</Badge>
                ) : (
                  <Badge variant="warn" dot>טרם שולם</Badge>
                )
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span className="muted">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
