'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseService } from '@/lib/supabase/service';
import { computeDemoWebhookSignature } from '@/lib/payments';

/**
 * Demo "Pay" action. Simulates the provider hitting our webhook after the
 * customer completes payment on their hosted page. In production this entire
 * function disappears — the provider makes the webhook call directly.
 */
export async function simulatePaymentSuccess(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  return await callOwnWebhook(paymentId, 'paid');
}

export async function simulatePaymentCancel(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  return await callOwnWebhook(paymentId, 'cancelled');
}

async function callOwnWebhook(paymentId: string, status: 'paid' | 'cancelled'): Promise<{ ok: boolean; error?: string }> {
  // Sanity: confirm the payment row exists before we sign anything.
  const supabase = createSupabaseService();
  const { data } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .maybeSingle();
  if (!data) return { ok: false, error: 'payment not found' };

  const payload = JSON.stringify({
    payment_id: paymentId,
    status,
    transaction_id: `demo_${Date.now()}`,
    paid_at: new Date().toISOString(),
  });

  const signature = await computeDemoWebhookSignature(payload);
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/webhooks/payment`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-payment-signature': signature,
    },
    body: payload,
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `webhook ${res.status}: ${text.slice(0, 200)}` };
  }

  revalidatePath(`/pay/${paymentId}`);
  return { ok: true };
}
