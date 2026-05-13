import 'server-only';
import { createSupabaseService } from './supabase/service';
import type { Order, Payment } from './supabase/database.types';

/**
 * Resolve the public-facing checkout URL for a given payment id.
 * The demo provider serves /pay/<id> in this same Next.js app. Real providers
 * would expose their hosted URL instead and we'd store it on the row.
 */
export function paymentUrlFor(paymentId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return `${base}/pay/${paymentId}`;
}

/**
 * Return the most-recent non-cancelled payment for an order, if any.
 * A unique index on `payments(order_id) WHERE status IN ('pending','paid')`
 * guarantees there is at most one active row, so callers can treat the
 * result as authoritative.
 */
export async function findActivePaymentForOrder(orderId: string): Promise<Payment | null> {
  const supabase = createSupabaseService();
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .in('status', ['pending', 'paid'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Payment | null) ?? null;
}

export async function findOrderByFlowToken(flowToken: string): Promise<Order | null> {
  const supabase = createSupabaseService();
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('flow_token', flowToken)
    .maybeSingle();
  return (data as Order | null) ?? null;
}

export async function createPendingPayment(opts: {
  orderId: string;
  flowToken: string;
  amount: number;
}): Promise<Payment> {
  const supabase = createSupabaseService();
  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id: opts.orderId,
      flow_token: opts.flowToken,
      amount: opts.amount,
      status: 'pending',
      provider: 'demo',
    })
    .select('*')
    .single();
  if (error) throw new Error(`payment create failed: ${error.message}`);
  return data as Payment;
}

/**
 * Signature for the demo provider's webhook. Real providers ship their
 * own scheme (HMAC headers, JWT, etc.). Keeping this here so the webhook
 * route and any test/admin tooling sign identically.
 *
 * The signed payload is the canonical JSON body — the caller must pass the
 * exact bytes that go on the wire.
 */
export async function computeDemoWebhookSignature(rawBody: string): Promise<string> {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? '';
  if (!secret) throw new Error('PAYMENT_WEBHOOK_SECRET is not configured');
  const { createHmac } = await import('node:crypto');
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

export async function verifyDemoWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  const expected = await computeDemoWebhookSignature(rawBody);
  const { timingSafeEqual } = await import('node:crypto');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
