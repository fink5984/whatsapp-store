import { notFound } from 'next/navigation';
import { createSupabaseService } from '@/lib/supabase/service';
import { formatCurrencyILS } from '@/lib/pricing';
import type { Order, Payment } from '@/lib/supabase/database.types';
import { PayDemoForm } from './pay-demo-form';

export const dynamic = 'force-dynamic';

export default async function PaymentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const supabase = createSupabaseService();
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .maybeSingle<Payment>();
  if (!payment) notFound();

  const { data: order } = await supabase
    .from('orders')
    .select('order_number, customer_name, customer_phone, total, store_id')
    .eq('id', payment.order_id)
    .maybeSingle<Pick<Order, 'order_number' | 'customer_name' | 'customer_phone' | 'total' | 'store_id'>>();

  const { data: store } = order
    ? await supabase.from('stores').select('name').eq('id', order.store_id).maybeSingle<{ name: string }>()
    : { data: null as { name: string } | null };

  const isPaid = payment.status === 'paid';
  const isFinal = payment.status !== 'pending';

  return (
    <main
      lang="he"
      dir="rtl"
      style={{
        fontFamily: 'Rubik, system-ui, sans-serif',
        minHeight: '100vh',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>תשלום דמו (סנדבוקס)</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          {store?.name ?? 'בית עסק'}
        </h1>
        {order && (
          <div style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
            הזמנה #{order.order_number} · {order.customer_name ?? ''}
          </div>
        )}

        <div
          style={{
            margin: '24px 0',
            padding: '20px 16px',
            background: '#f9fafb',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <div style={{ color: '#6b7280', fontSize: 14 }}>סכום לתשלום</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
            {formatCurrencyILS(Number(payment.amount))}
          </div>
        </div>

        {isPaid && (
          <div
            style={{
              background: '#ecfdf5',
              color: '#065f46',
              padding: 12,
              borderRadius: 8,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            ✓ התשלום אומת. חזור ל־WhatsApp ולחץ על "בדוק תשלום".
          </div>
        )}

        {!isPaid && payment.status === 'cancelled' && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: 12,
              borderRadius: 8,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            התשלום בוטל.
          </div>
        )}

        {!isFinal && <PayDemoForm paymentId={payment.id} />}

        <div style={{ marginTop: 24, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
          payment_id: {payment.id}
        </div>
      </div>
    </main>
  );
}
