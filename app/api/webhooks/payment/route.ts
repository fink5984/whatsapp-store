import { NextResponse } from 'next/server';
import { createSupabaseService } from '@/lib/supabase/service';
import { sendStoreOrderNotification } from '@/lib/notifications';
import { verifyDemoWebhookSignature } from '@/lib/payments';
import type { Payment } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Payment provider webhook.
 *
 *   POST /api/webhooks/payment
 *   Headers:  X-Payment-Signature: <hex sha256 hmac of the raw body>
 *   Body:     { payment_id: string, status: 'paid'|'failed'|'cancelled',
 *               transaction_id?: string, paid_at?: ISO8601 }
 *
 * Contract:
 *  - Signature is verified against PAYMENT_WEBHOOK_SECRET (HMAC-SHA256).
 *    Unsigned or mismatched requests return 401.
 *  - Idempotent: re-delivering the same payload for an already-paid payment
 *    is a no-op and returns 200 (so the provider stops retrying).
 *  - When status flips to 'paid' we update orders.payment_status='paid' in
 *    the same call and fire the store notification once.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-payment-signature') ?? '';

  if (!(await verifyDemoWebhookSignature(raw, signature))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: {
    payment_id?: string;
    status?: string;
    transaction_id?: string;
    paid_at?: string;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const paymentId = payload.payment_id;
  const incomingStatus = payload.status;
  if (!paymentId || !incomingStatus) {
    return NextResponse.json({ error: 'missing payment_id or status' }, { status: 400 });
  }
  if (!['paid', 'failed', 'cancelled'].includes(incomingStatus)) {
    return NextResponse.json({ error: 'unsupported status' }, { status: 400 });
  }

  const supabase = createSupabaseService();
  const { data: paymentRow } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  const payment = paymentRow as Payment | null;

  if (!payment) return NextResponse.json({ error: 'payment not found' }, { status: 404 });

  // Idempotency: terminal states never change.
  if (payment.status === 'paid' || payment.status === incomingStatus) {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const nowIso = new Date().toISOString();
  const { error: paymentErr } = await supabase
    .from('payments')
    .update({
      status: incomingStatus,
      transaction_id: payload.transaction_id ?? payment.transaction_id ?? null,
      paid_at: incomingStatus === 'paid' ? (payload.paid_at ?? nowIso) : payment.paid_at,
      raw_webhook: payload as Record<string, unknown>,
    })
    .eq('id', paymentId)
    // Guard against the row flipping under us between read and write.
    .eq('status', payment.status);
  if (paymentErr) {
    return NextResponse.json({ error: 'payment update failed' }, { status: 500 });
  }

  if (incomingStatus === 'paid') {
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', payment_method: payment.provider })
      .eq('id', payment.order_id);

    // Fire-and-forget; failure here must not break webhook acknowledgment.
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

  return NextResponse.json({ ok: true });
}
