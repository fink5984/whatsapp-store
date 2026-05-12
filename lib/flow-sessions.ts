import 'server-only';
import { createSupabaseService } from './supabase/service';
import type { CartItem, FlowSession } from './supabase/database.types';

export async function getOrCreateSession(flowToken: string): Promise<FlowSession> {
  const supabase = createSupabaseService();

  const { data: existing } = await supabase
    .from('flow_sessions')
    .select('*')
    .eq('flow_token', flowToken)
    .maybeSingle();

  if (existing) return existing as FlowSession;

  const { data, error } = await supabase
    .from('flow_sessions')
    .insert({ flow_token: flowToken })
    .select('*')
    .single();

  if (error) throw new Error(`flow_session create failed: ${error.message}`);
  return data as FlowSession;
}

export async function updateSessionStore(flowToken: string, storeId: string) {
  const supabase = createSupabaseService();
  const { error } = await supabase
    .from('flow_sessions')
    .update({ store_id: storeId, cart_json: [], updated_at: new Date().toISOString() })
    .eq('flow_token', flowToken);
  if (error) throw new Error(error.message);
}

export async function getCart(flowToken: string): Promise<CartItem[]> {
  const session = await getOrCreateSession(flowToken);
  return Array.isArray(session.cart_json) ? (session.cart_json as CartItem[]) : [];
}

export async function setCart(flowToken: string, cart: CartItem[]) {
  const supabase = createSupabaseService();
  const { error } = await supabase
    .from('flow_sessions')
    .update({ cart_json: cart })
    .eq('flow_token', flowToken);
  if (error) throw new Error(error.message);
}

export async function addItemToCart(flowToken: string, item: CartItem) {
  const current = await getCart(flowToken);
  await setCart(flowToken, [...current, item]);
}

export async function clearCart(flowToken: string) {
  await setCart(flowToken, []);
}

export async function updateCustomerJson(
  flowToken: string,
  customerData: Record<string, unknown>,
) {
  const supabase = createSupabaseService();
  const existing = await getOrCreateSession(flowToken);
  const merged = { ...(existing.customer_json || {}), ...customerData };
  const { error } = await supabase
    .from('flow_sessions')
    .update({ customer_json: merged, customer_phone: (merged as any).phone ?? existing.customer_phone })
    .eq('flow_token', flowToken);
  if (error) throw new Error(error.message);
}

export async function completeSession(flowToken: string) {
  const supabase = createSupabaseService();
  await supabase
    .from('flow_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('flow_token', flowToken);
}

export async function setCurrentScreen(flowToken: string, screen: string) {
  const supabase = createSupabaseService();
  await supabase.from('flow_sessions').update({ current_screen: screen }).eq('flow_token', flowToken);
}
