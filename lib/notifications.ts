import 'server-only';
import { createSupabaseService } from './supabase/service';

/**
 * Push an order notification to every configured channel for the store.
 *
 * Today this:
 *   1. logs a structured payload
 *   2. POSTs to ORDER_NOTIFICATION_WEBHOOK_URL if set
 *   3. POSTs to every active store_notifications.target whose channel is 'webhook'
 *
 * The interface is stable so we can wire WhatsApp Cloud / email / SMS later
 * without touching callers.
 */
export async function sendStoreOrderNotification(storeId: string, orderId: string) {
  const supabase = createSupabaseService();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (!order) return;

  const { data: items } = await supabase
    .from('order_items')
    .select('*, order_item_options(*)')
    .eq('order_id', orderId);

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, whatsapp_phone, phone, email')
    .eq('id', storeId)
    .single();

  const { data: channels } = await supabase
    .from('store_notifications')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const payload = {
    event: 'order.created',
    store: store ?? { id: storeId },
    order,
    items: items ?? [],
    timestamp: new Date().toISOString(),
  };

  // 1. structured console log (replaces stack-trace noise in prod)
  console.log(
    JSON.stringify({
      level: 'info',
      scope: 'order_notification',
      store_id: storeId,
      order_id: orderId,
      order_number: order.order_number,
      total: order.total,
    }),
  );

  // 2. fan-out to env webhook
  const envWebhook = process.env.ORDER_NOTIFICATION_WEBHOOK_URL;
  if (envWebhook) {
    fireAndForget(postWebhook(envWebhook, payload));
  }

  // 3. fan-out to per-store webhook channels
  for (const c of channels ?? []) {
    if (c.channel === 'webhook' && c.target) {
      fireAndForget(postWebhook(c.target, payload));
    }
    // Other channels (whatsapp, email, sms) — to be wired in a follow-up.
  }
}

async function postWebhook(url: string, payload: unknown) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('order webhook failed', (err as Error).message);
  }
}

function fireAndForget(p: Promise<unknown>) {
  p.catch(() => undefined);
}
