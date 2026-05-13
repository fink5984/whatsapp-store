'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseService } from '@/lib/supabase/service';
import { sendStoreOrderNotification } from '@/lib/notifications';
import type { Payment } from '@/lib/supabase/database.types';

/**
 * Demo "Pay" / "Cancel" actions for the hosted payment page.
 *
 * For the demo we update the DB directly instead of POSTing to our own
 * /api/webhooks/payment. Two reasons:
 *
 *  1. The webhook is the real-provider integration point and depends on a
 *     PAYMENT_WEBHOOK_SECRET env var. If that secret isn't set in the host
 *     environment (e.g. a fresh Railway deploy) the round-trip throws and
 *     the customer sees a generic "Application error" page.
 *  2. Bypassing the HTTP hop is cheaper and lets the demo work even when
 *     NEXT_PUBLIC_APP_URL is unreachable from the server itself.
 *
 * A real payment provider would still hit /api/webhooks/payment over HTTP
 * with a signed body — that route stays in place untouched.
 */
export async function simulatePaymentSuccess(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  return await markDemoPayment(paymentId, 'paid');
}

export async function simulatePaymentCancel(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  return await markDemoPayment(paymentId, 'cancelled');
}

async function markDemoPayment(
  paymentId: string,
  newStatus: 'paid' | 'cancelled',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseService();

  const { data: paymentRow } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  const payment = paymentRow as Payment | null;
  if (!payment) return { ok: false, error: 'payment not found' };

  // Idempotent: a terminal state never changes.
  if (payment.status === 'paid' || payment.status === newStatus) {
    revalidatePath(`/pay/${paymentId}`);
    return { ok: true };
  }

  const nowIso = new Date().toISOString();
  const { error: paymentErr } = await supabase
    .from('payments')
    .update({
      status: newStatus,
      transaction_id: newStatus === 'paid' ? `demo_${Date.now()}` : payment.transaction_id,
      paid_at: newStatus === 'paid' ? nowIso : payment.paid_at,
      raw_webhook: { source: 'demo_page', status: newStatus, at: nowIso } as Record<string, unknown>,
    })
    .eq('id', paymentId)
    // Optimistic concurrency: refuse to overwrite if the row already moved.
    .eq('status', payment.status);
  if (paymentErr) return { ok: false, error: paymentErr.message };

  if (newStatus === 'paid') {
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_method: payment.provider })
      .eq('id', payment.order_id);

    const { data: order } = await supabase
      .from('orders')
      .select('store_id')
      .eq('id', payment.order_id)
      .maybeSingle();
    const storeId = (order as { store_id?: string } | null)?.store_id;
    if (storeId) {
      sendStoreOrderNotification(storeId, payment.order_id).catch((e) =>
        console.warn('notification failed', (e as Error).message),
      );
    }
  }

  revalidatePath(`/pay/${paymentId}`);
  return { ok: true };
}
