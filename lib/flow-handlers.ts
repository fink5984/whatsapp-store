import 'server-only';

import { createSupabaseService } from './supabase/service';
import {
  buildCartScreen,
  buildCategoryScreen,
  buildCustomerDetailsScreen,
  buildDeliveryMethodScreen,
  buildErrorScreen,
  buildOrderSummaryScreen,
  buildProductCustomizeScreen,
  buildProductsScreen,
  buildStoreResultsScreen,
  buildStoreSearchScreen,
  buildStoreWelcomeScreen,
  buildSuccessScreen,
  type FlowScreenResponse,
  type OrderDraft,
} from './flow-builders';
import {
  addItemToCart,
  clearCart,
  completeSession,
  getCart,
  getOrCreateSession,
  setCart,
  setCurrentScreen,
  updateCustomerJson,
  updateSessionStore,
} from './flow-sessions';
import { calculateCartTotals, calculateItemTotal } from './pricing';
import { sendStoreOrderNotification } from './notifications';
import type {
  CartItem,
  Category,
  Customer,
  Option,
  OptionGroup,
  Product,
  Store,
} from './supabase/database.types';

export interface FlowRequestBody {
  version: string;
  action: 'INIT' | 'data_exchange' | 'BACK' | 'ping';
  screen?: string;
  data?: Record<string, any>;
  flow_token: string;
}

/**
 * Top-level router. Receives the **decrypted** body and returns the response
 * payload that will be re-encrypted by the caller.
 */
export async function handleFlow(body: FlowRequestBody): Promise<FlowScreenResponse | Record<string, unknown>> {
  if (body.action === 'ping') {
    return { data: { status: 'active' } };
  }

  if (!body.flow_token) {
    return buildErrorScreen('חסר flow_token בבקשה');
  }

  const session = await getOrCreateSession(body.flow_token);

  // Hard lock: once an order has been placed for this flow_token, every subsequent
  // request (INIT, data_exchange, BACK) replays the SUCCESS screen.
  // WhatsApp may resume the flow client-side without sending INIT, so we cannot
  // rely on INIT alone.
  if (session.status === 'completed') {
    const supabase = createSupabaseService();
    const { data: existing } = await supabase
      .from('orders')
      .select('order_number, total')
      .eq('flow_token', body.flow_token)
      .maybeSingle();
    return buildSuccessScreen({
      order_number: (existing as any)?.order_number ?? 0,
      total: Number((existing as any)?.total ?? 0),
      estimated_minutes: 0,
      already_completed: true,
    });
  }

  if (body.action === 'INIT') {
    await setCurrentScreen(body.flow_token, 'STORE_SEARCH');
    return buildStoreSearchScreen();
  }

  if (body.action === 'BACK') {
    const screen = body.screen || '';
    // Block back navigation from CART — re-render CART instead.
    if (screen === 'CART') {
      const cart = await getCart(body.flow_token);
      return buildCartScreen(cart, calculateCartTotals(cart));
    }
    // Block back navigation from the confirmation screen — the order is done.
    if (screen === 'ORDER_CONFIRMED') {
      const supabase = createSupabaseService();
      const { data: existing } = await supabase
        .from('orders')
        .select('order_number, total')
        .eq('flow_token', body.flow_token)
        .maybeSingle();
      return buildSuccessScreen({
        order_number: (existing as any)?.order_number ?? 0,
        total: Number((existing as any)?.total ?? 0),
        estimated_minutes: 0,
        already_completed: true,
      });
    }
    // For all other screens, default to the store search.
    return buildStoreSearchScreen();
  }

  const data = body.data ?? {};
  const step = (data.step as string) || body.screen || '';

  try {
    switch (step) {
      case 'search_stores':
        return await stepSearchStores(data);
      case 'select_store':
        return await stepSelectStore(body.flow_token, data);
      case 'get_categories':
        return await stepGetCategories(session.store_id);
      case 'get_products':
        return await stepGetProducts(session.store_id, data);
      case 'select_product':
        return await stepSelectProduct(session.store_id, data);
      case 'add_to_cart':
        return await stepAddToCart(body.flow_token, session.store_id, data);
      case 'continue_shopping':
      case 'add_more':
        return await stepGetCategories(session.store_id);
      case 'clear_cart':
        await clearCart(body.flow_token);
        return await stepGetCategories(session.store_id);
      case 'remove_items':
        return await stepRemoveItems(body.flow_token, data);
      case 'checkout':
        return await stepCheckout(session.store_id);
      case 'set_delivery_method':
        return await stepSetDeliveryMethod(body.flow_token, data);
      case 'validate_customer_details':
        return await stepValidateCustomerDetails(body.flow_token, session.store_id, data);
      case 'submit_order':
        return await stepSubmitOrder(body.flow_token);
      default:
        return buildErrorScreen('פעולה לא ידועה');
    }
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', scope: 'flow', step, message: (err as Error).message }));
    return buildErrorScreen('אירעה שגיאה. נסה שוב.');
  }
}

/* ------------------------------------------------------------------ */
/* steps                                                              */
/* ------------------------------------------------------------------ */

async function stepSearchStores(data: Record<string, any>) {
  const supabase = createSupabaseService();
  const q = (data.query ?? '').trim();
  const city = (data.city ?? '').trim();
  const category = (data.category ?? '').trim();

  let query = supabase.from('stores').select('*').eq('is_active', true).limit(10);

  if (q) {
    // Match name OR slug OR store_code
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,store_code.ilike.%${q}%`);
  }
  if (city) query = query.ilike('city', `%${city}%`);
  if (category) query = query.ilike('category', `%${category}%`);

  const { data: stores, error } = await query;
  if (error) throw new Error(error.message);

  return await buildStoreResultsScreen((stores as Store[]) ?? []);
}

async function stepSelectStore(flowToken: string, data: Record<string, any>) {
  const storeId = data.store_id as string;
  if (!storeId) return buildErrorScreen('לא נבחרה חנות');
  const supabase = createSupabaseService();

  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!store) return buildErrorScreen('החנות לא פעילה כרגע');

  await updateSessionStore(flowToken, storeId);
  await setCurrentScreen(flowToken, 'STORE_WELCOME');
  return buildStoreWelcomeScreen(store as Store);
}

async function stepGetCategories(storeId: string | null) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const supabase = createSupabaseService();
  const [{ data: store }, { data: cats }] = await Promise.all([
    supabase.from('stores').select('*').eq('id', storeId).single(),
    supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order'),
  ]);
  if (!store) return buildErrorScreen('החנות לא נמצאה');
  return await buildCategoryScreen(store as Store, (cats as Category[]) ?? []);
}

async function stepGetProducts(storeId: string | null, data: Record<string, any>) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const categoryId = data.category_id as string | undefined;
  if (!categoryId) return buildErrorScreen('בחר קטגוריה');

  const supabase = createSupabaseService();
  const [{ data: store }, { data: cat }, { data: products }] = await Promise.all([
    supabase.from('stores').select('*').eq('id', storeId).single(),
    supabase.from('categories').select('*').eq('id', categoryId).eq('store_id', storeId).single(),
    supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .eq('is_available', true)
      .order('sort_order'),
  ]);

  if (!store || !cat) return buildErrorScreen('קטגוריה לא נמצאה');
  return await buildProductsScreen(store as Store, cat as Category, (products as Product[]) ?? []);
}

async function stepSelectProduct(storeId: string | null, data: Record<string, any>) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const productId = data.product_id as string | undefined;
  if (!productId) return buildErrorScreen('בחר מוצר');

  const supabase = createSupabaseService();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (!product) return buildErrorScreen('המוצר אינו זמין');

  const { data: links } = await supabase
    .from('product_option_groups')
    .select('group_id')
    .eq('product_id', productId);

  const groupIds = (links ?? []).map((l) => l.group_id as string);
  let optionGroups: { group: OptionGroup; options: Option[] }[] = [];

  if (groupIds.length) {
    const { data: groups } = await supabase
      .from('option_groups')
      .select('*')
      .in('id', groupIds)
      .eq('is_active', true)
      .order('sort_order');
    const { data: options } = await supabase
      .from('options')
      .select('*')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .order('sort_order');

    optionGroups = (groups ?? []).map((g) => ({
      group: g as OptionGroup,
      options: (options ?? []).filter((o) => o.group_id === g.id) as Option[],
    }));
  }

  return await buildProductCustomizeScreen(product as Product, optionGroups, (product as Product).allow_note);
}

async function stepAddToCart(
  flowToken: string,
  storeId: string | null,
  data: Record<string, any>,
) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const supabase = createSupabaseService();

  const productId = data.product_id as string;
  const quantity = Math.max(1, Math.floor(Number(data.quantity) || 1));
  const note = (data.note as string | undefined)?.slice(0, 500) ?? null;

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (!product || !product.is_active || !product.is_available) {
    return buildErrorScreen('המוצר אינו זמין');
  }

  // Gather chosen option ids from groups 1..5 (each may be string id or array of ids)
  const chosenIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const raw = data[`group_${i}_choice`];
    if (Array.isArray(raw)) chosenIds.push(...raw.filter(Boolean));
    else if (typeof raw === 'string' && raw) chosenIds.push(raw);
  }

  let options: { id: string; name: string; price_delta: number; group_id: string; group_name: string }[] = [];
  if (chosenIds.length) {
    const { data: optionRows } = await supabase
      .from('options')
      .select('*, option_groups!inner(id, name, store_id)')
      .in('id', chosenIds)
      .eq('store_id', storeId);

    options = (optionRows ?? []).map((o: any) => ({
      id: o.id,
      name: o.name,
      price_delta: Number(o.price_delta || 0),
      group_id: o.option_groups?.id,
      group_name: o.option_groups?.name ?? '',
    }));
  }

  const totals = calculateItemTotal(
    product as Product,
    options.map((o) => ({
      option_id: o.id,
      group_id: o.group_id,
      group_name: o.group_name,
      option_name: o.name,
      price_delta: o.price_delta,
    })),
    quantity,
  );

  const cartItem: CartItem = {
    cart_item_id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    product_id: productId,
    product_name: (product as Product).name,
    unit_price: totals.unit_price,
    quantity: totals.quantity,
    options: options.map((o) => ({
      option_id: o.id,
      group_id: o.group_id,
      group_name: o.group_name,
      option_name: o.name,
      price_delta: o.price_delta,
    })),
    options_total: totals.options_total,
    total_price: totals.total_price,
    note,
  };

  await addItemToCart(flowToken, cartItem);
  const cart = await getCart(flowToken);
  return buildCartScreen(cart, calculateCartTotals(cart));
}

async function stepRemoveItems(flowToken: string, data: Record<string, any>) {
  const raw = data.items_to_remove;
  let ids: string[] = [];
  if (Array.isArray(raw)) ids = raw.filter(Boolean);
  else if (typeof raw === 'string' && raw) ids = [raw];

  const cart = await getCart(flowToken);
  if (ids.length === 0) {
    // Nothing checked — just refresh CART
    return buildCartScreen(cart, calculateCartTotals(cart));
  }
  const next = cart.filter((i) => !ids.includes(i.cart_item_id));
  await setCart(flowToken, next);
  return buildCartScreen(next, calculateCartTotals(next));
}

async function stepCheckout(storeId: string | null) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const supabase = createSupabaseService();
  const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).single();
  if (!store) return buildErrorScreen('החנות לא נמצאה');
  return buildDeliveryMethodScreen(store as Store);
}

async function stepSetDeliveryMethod(flowToken: string, data: Record<string, any>) {
  const deliveryType = data.delivery_type === 'pickup' ? 'pickup' : 'delivery';
  await updateCustomerJson(flowToken, { delivery_type: deliveryType });

  const supabase = createSupabaseService();
  const session = await getOrCreateSession(flowToken);
  let customer: Customer | null = null;
  if (session.customer_phone) {
    const { data: existing } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', session.customer_phone)
      .maybeSingle();
    customer = (existing as Customer) ?? null;
  }
  return buildCustomerDetailsScreen(customer, deliveryType);
}

async function stepValidateCustomerDetails(
  flowToken: string,
  storeId: string | null,
  data: Record<string, any>,
) {
  if (!storeId) return buildErrorScreen('יש לבחור חנות תחילה');
  const supabase = createSupabaseService();
  const session = await getOrCreateSession(flowToken);

  const customer = {
    name: (data.customer_name ?? '').trim(),
    phone: (data.customer_phone ?? '').trim(),
    email: (data.customer_email ?? '').trim(),
    city: (data.city ?? '').trim(),
    address: (data.address ?? '').trim(),
    floor: (data.floor ?? '').trim(),
    apartment: (data.apartment ?? '').trim(),
    note: (data.note ?? '').slice(0, 500),
  };

  const deliveryType =
    ((session.customer_json as any)?.delivery_type as 'delivery' | 'pickup') || 'delivery';
  const errors: Record<string, string> = {};
  if (!customer.name) errors.name = 'שם חובה';
  if (!customer.phone) errors.phone = 'טלפון חובה';
  if (deliveryType === 'delivery') {
    if (!customer.city) errors.city = 'עיר חובה למשלוח';
    if (!customer.address) errors.address = 'כתובת חובה למשלוח';
  }

  const cart = await getCart(flowToken);
  if (cart.length === 0) {
    return buildErrorScreen('העגלה ריקה');
  }

  const { subtotal } = calculateCartTotals(cart);
  let deliveryFee = 0;
  let estimatedMinutes = 0;

  const { data: store } = await supabase.from('stores').select('*').eq('id', storeId).single();
  if (!store || !(store as Store).is_active) {
    return buildErrorScreen('החנות לא פעילה כרגע');
  }
  estimatedMinutes = (store as Store).estimated_preparation_minutes;

  if (deliveryType === 'delivery') {
    const { data: zone } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('store_id', storeId)
      .ilike('city', customer.city)
      .eq('is_active', true)
      .maybeSingle();

    if (!zone) {
      errors.city = 'לא מבצעים משלוח לעיר זו';
    } else {
      deliveryFee = (zone as any).delivery_fee;
      if (subtotal < (zone as any).minimum_order) {
        errors.minimum = `מינימום הזמנה לעיר ${customer.city}: ${(zone as any).minimum_order} ₪`;
      }
      estimatedMinutes = (zone as any).estimated_minutes ?? estimatedMinutes;
    }
  }

  if ((store as Store).minimum_order && subtotal < (store as Store).minimum_order) {
    errors.minimum = `מינימום הזמנה לחנות: ${(store as Store).minimum_order} ₪`;
  }

  if (Object.keys(errors).length) {
    return buildCustomerDetailsScreen(
      {
        id: 'tmp',
        phone: customer.phone,
        full_name: customer.name,
        email: customer.email || null,
        city: customer.city || null,
        address: customer.address || null,
        floor: customer.floor || null,
        apartment: customer.apartment || null,
        entrance: null,
        notes: customer.note || null,
        created_at: '',
        updated_at: '',
      } as Customer,
      deliveryType,
      errors,
    );
  }

  await updateCustomerJson(flowToken, {
    ...customer,
    delivery_type: deliveryType,
    delivery_fee: deliveryFee,
  });

  const draft: OrderDraft = {
    cart,
    subtotal,
    delivery_fee: deliveryFee,
    total: subtotal + deliveryFee,
    delivery_type: deliveryType,
    customer,
    estimated_minutes: estimatedMinutes,
  };
  return buildOrderSummaryScreen(draft);
}

async function stepSubmitOrder(flowToken: string) {
  const supabase = createSupabaseService();

  // Always check for an existing order first — covers cases where the session
  // was not properly marked completed (e.g. DB error after order creation).
  const { data: existingCheck } = await supabase
    .from('orders')
    .select('order_number, total')
    .eq('flow_token', flowToken)
    .maybeSingle();
  if (existingCheck) {
    return buildSuccessScreen({
      order_number: (existingCheck as any).order_number,
      total: Number((existingCheck as any).total),
      estimated_minutes: 0,
      already_completed: true,
    });
  }

  const session = await getOrCreateSession(flowToken);

  const cart = await getCart(flowToken);
  if (cart.length === 0) return buildErrorScreen('העגלה ריקה');
  if (!session.store_id) return buildErrorScreen('לא נבחרה חנות');

  const { data: store } = await supabase.from('stores').select('*').eq('id', session.store_id).single();
  if (!store || !(store as Store).is_active) return buildErrorScreen('החנות לא פעילה כרגע');

  const customerJson = (session.customer_json ?? {}) as Record<string, string>;
  const deliveryType = (customerJson.delivery_type === 'pickup' ? 'pickup' : 'delivery') as
    | 'pickup'
    | 'delivery';
  const deliveryFee = Number(customerJson.delivery_fee ?? 0);
  const { subtotal } = calculateCartTotals(cart);
  const total = subtotal + deliveryFee;

  // upsert customer
  let customerId: string | null = null;
  if (customerJson.phone) {
    const { data: cust } = await supabase
      .from('customers')
      .upsert(
        {
          phone: customerJson.phone,
          full_name: customerJson.name || null,
          email: customerJson.email || null,
          city: customerJson.city || null,
          address: customerJson.address || null,
          floor: customerJson.floor || null,
          apartment: customerJson.apartment || null,
          notes: customerJson.note || null,
        },
        { onConflict: 'phone' },
      )
      .select('id')
      .single();
    customerId = (cust as any)?.id ?? null;
  }

  // create order — UNIQUE(flow_token) makes this idempotent under concurrency
  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: session.store_id,
      customer_id: customerId,
      flow_token: flowToken,
      customer_name: customerJson.name || null,
      customer_phone: customerJson.phone || null,
      customer_email: customerJson.email || null,
      delivery_type: deliveryType,
      city: customerJson.city || null,
      address: customerJson.address || null,
      floor: customerJson.floor || null,
      apartment: customerJson.apartment || null,
      customer_note: customerJson.note || null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    })
    .select('*')
    .single();

  if (orderError) {
    // Likely the unique violation on flow_token — try to recover the existing row
    const { data: existing } = await supabase
      .from('orders')
      .select('order_number, total')
      .eq('flow_token', flowToken)
      .maybeSingle();
    if (existing) {
      return buildSuccessScreen({
        order_number: (existing as any).order_number,
        total: (existing as any).total,
        estimated_minutes: (store as Store).estimated_preparation_minutes,
        already_completed: true,
      });
    }
    throw orderError;
  }

  const order = orderInsert as any;
  const orderId = order.id as string;

  // create order_items + options
  for (const item of cart) {
    const { data: itemRow } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        options_total: item.options_total,
        total_price: item.total_price,
        note: item.note ?? null,
      })
      .select('id')
      .single();

    const itemId = (itemRow as any)?.id;
    if (itemId && item.options.length) {
      await supabase.from('order_item_options').insert(
        item.options.map((o) => ({
          order_item_id: itemId,
          option_id: o.option_id,
          group_name: o.group_name,
          option_name: o.option_name,
          price_delta: o.price_delta,
        })),
      );
    }
  }

  await completeSession(flowToken);

  // fire-and-forget notification (do NOT await — keep WhatsApp response fast)
  sendStoreOrderNotification(session.store_id, orderId).catch((e) =>
    console.warn('notification failed', (e as Error).message),
  );

  return buildSuccessScreen({
    order_number: order.order_number,
    total: order.total,
    estimated_minutes: (store as Store).estimated_preparation_minutes,
  });
}
