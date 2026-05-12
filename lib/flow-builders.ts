import type {
  CartItem,
  Category,
  Customer,
  DeliveryZone,
  Option,
  OptionGroup,
  Product,
  Store,
} from './supabase/database.types';
import { formatCurrencyILS } from './pricing';

export interface FlowScreenResponse {
  screen: string;
  data: Record<string, unknown>;
}

/* --------------------------- helpers --------------------------- */

const truncate = (s: string | null | undefined, n: number) => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

/* --------------------------- builders --------------------------- */

export function buildStoreSearchScreen(opts: { error_message?: string } = {}): FlowScreenResponse {
  return {
    screen: 'STORE_SEARCH',
    data: {
      title: 'מצא חנות',
      subtitle: 'חפש לפי שם, קוד או עיר',
      error_message: opts.error_message ?? '',
      has_error: !!opts.error_message,
    },
  };
}

export function buildStoreResultsScreen(stores: Store[]): FlowScreenResponse {
  const items = stores.slice(0, 10).map((s) => ({
    id: s.id,
    title: truncate(`${s.name}${s.city ? ` · ${s.city}` : ''}`, 60),
    description: truncate(s.category ?? s.description ?? '', 60),
  }));

  if (items.length === 0) {
    return buildStoreSearchScreen({
      error_message: 'לא נמצאו חנויות מתאימות. נסה לחפש בשם אחר.',
    });
  }
  return {
    screen: 'STORE_RESULTS',
    data: {
      title: `נמצאו ${items.length} חנויות`,
      stores: items,
    },
  };
}

export function buildStoreWelcomeScreen(store: Store): FlowScreenResponse {
  const lines: string[] = [];
  if (store.estimated_preparation_minutes) {
    lines.push(`זמן הכנה משוער: ${store.estimated_preparation_minutes} דקות`);
  }
  const channels = [
    store.accepts_delivery ? 'משלוחים' : null,
    store.accepts_pickup ? 'איסוף עצמי' : null,
  ].filter(Boolean).join(' · ');
  if (channels) lines.push(channels);

  return {
    screen: 'STORE_WELCOME',
    data: {
      store_id: store.id,
      store_name: store.name,
      description: truncate(store.description, 240) || 'ברוכים הבאים!',
      details: lines.join('\n'),
    },
  };
}

export function buildCategoryScreen(store: Store, categories: Category[]): FlowScreenResponse {
  const items = categories
    .filter((c) => c.is_active)
    .slice(0, 20)
    .map((c) => ({
      id: c.id,
      title: truncate(c.name, 50),
      description: truncate(c.description ?? '', 60),
    }));

  return {
    screen: 'CATEGORY_SELECT',
    data: {
      store_id: store.id,
      store_name: store.name,
      title: 'בחר קטגוריה',
      categories: items,
    },
  };
}

export function buildProductsScreen(
  store: Store,
  category: Category | null,
  products: Product[],
): FlowScreenResponse {
  const items = products
    .filter((p) => p.is_active && p.is_available)
    .slice(0, 20)
    .map((p) => ({
      id: p.id,
      title: truncate(p.name, 50),
      description: `${formatCurrencyILS(p.price)}${
        p.description ? ` · ${truncate(p.description, 50)}` : ''
      }`,
    }));

  return {
    screen: 'PRODUCT_SELECT',
    data: {
      store_id: store.id,
      category_id: category?.id ?? '',
      category_name: category?.name ?? '',
      title: category ? `מוצרים ב${category.name}` : 'מוצרים',
      products: items,
    },
  };
}

export function buildProductCustomizeScreen(
  product: Product,
  optionGroups: { group: OptionGroup; options: Option[] }[],
  allowNote: boolean,
): FlowScreenResponse {
  // Flow JSON has up to 5 statically defined groups; we control visibility/data
  // dynamically here.
  const groupsForFlow = optionGroups.slice(0, 5).map(({ group, options }, idx) => ({
    index: idx + 1,
    visible: true,
    group_id: group.id,
    name: group.name,
    is_required: group.is_required,
    min_select: group.min_select,
    max_select: group.max_select,
    use_multi: group.max_select > 1,
    options: options
      .filter((o) => o.is_active)
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        title: o.price_delta > 0
          ? `${truncate(o.name, 40)} (+${formatCurrencyILS(o.price_delta)})`
          : truncate(o.name, 50),
      })),
  }));

  // Pad to 5 slots so flow.json has stable references.
  while (groupsForFlow.length < 5) {
    groupsForFlow.push({
      index: groupsForFlow.length + 1,
      visible: false,
      group_id: '',
      name: '',
      is_required: false,
      min_select: 0,
      max_select: 0,
      use_multi: false,
      options: [],
    });
  }

  return {
    screen: 'PRODUCT_CUSTOMIZE',
    data: {
      product_id: product.id,
      product_name: product.name,
      product_description: truncate(product.description ?? '', 200),
      price: formatCurrencyILS(product.price),
      price_value: product.price,
      max_quantity: product.max_quantity_per_order,
      allow_note: allowNote && product.allow_note,
      groups: groupsForFlow,
      group_1: groupsForFlow[0],
      group_2: groupsForFlow[1],
      group_3: groupsForFlow[2],
      group_4: groupsForFlow[3],
      group_5: groupsForFlow[4],
    },
  };
}

export function buildCartScreen(
  cart: CartItem[],
  totals: { subtotal: number; item_count: number },
): FlowScreenResponse {
  const lines = cart.map((i) => {
    const opt = i.options.length ? `   (${i.options.map((o) => o.option_name).join(', ')})` : '';
    return `${i.quantity} × ${i.product_name} — ${formatCurrencyILS(i.total_price)}${opt}`;
  });

  return {
    screen: 'CART',
    data: {
      is_empty: cart.length === 0,
      cart_summary: lines.join('\n') || 'העגלה ריקה',
      item_count: totals.item_count,
      total: formatCurrencyILS(totals.subtotal),
      total_value: totals.subtotal,
    },
  };
}

export function buildDeliveryMethodScreen(store: Store): FlowScreenResponse {
  const methods: { id: string; title: string; description?: string }[] = [];
  if (store.accepts_delivery) methods.push({ id: 'delivery', title: 'משלוח לכתובת' });
  if (store.accepts_pickup) {
    methods.push({
      id: 'pickup',
      title: 'איסוף עצמי',
      description: store.address ?? '',
    });
  }
  return {
    screen: 'DELIVERY_METHOD',
    data: {
      store_id: store.id,
      methods,
    },
  };
}

export function buildCustomerDetailsScreen(
  customer: Customer | null,
  deliveryType: 'delivery' | 'pickup',
  errors: Record<string, string> = {},
): FlowScreenResponse {
  return {
    screen: 'CUSTOMER_DETAILS',
    data: {
      is_delivery: deliveryType === 'delivery',
      customer_name: customer?.full_name ?? '',
      customer_phone: customer?.phone ?? '',
      customer_email: customer?.email ?? '',
      city: customer?.city ?? '',
      address: customer?.address ?? '',
      floor: customer?.floor ?? '',
      apartment: customer?.apartment ?? '',
      note: customer?.notes ?? '',
      error_message: Object.values(errors).join('\n'),
      has_error: Object.keys(errors).length > 0,
    },
  };
}

export interface OrderDraft {
  cart: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_type: 'delivery' | 'pickup';
  customer: Record<string, string>;
  estimated_minutes: number;
}

export function buildOrderSummaryScreen(draft: OrderDraft): FlowScreenResponse {
  const lines = draft.cart.map((i) => {
    const opts = i.options.length ? ` (${i.options.map((o) => o.option_name).join(', ')})` : '';
    return `${i.quantity} × ${i.product_name}${opts} — ${formatCurrencyILS(i.total_price)}`;
  });
  const address =
    draft.delivery_type === 'delivery'
      ? [draft.customer.address, draft.customer.city].filter(Boolean).join(', ')
      : 'איסוף עצמי';

  return {
    screen: 'ORDER_SUMMARY',
    data: {
      order_summary: lines.join('\n'),
      subtotal_text: `סכום ביניים: ${formatCurrencyILS(draft.subtotal)}`,
      delivery_fee_text: `משלוח: ${formatCurrencyILS(draft.delivery_fee)}`,
      total_text: `סך הכל: ${formatCurrencyILS(draft.total)}`,
      customer_line: [draft.customer.name, draft.customer.phone].filter(Boolean).join(' · '),
      address,
      estimated_text: `זמן הכנה משוער: ${draft.estimated_minutes} דקות`,
    },
  };
}

export function buildSuccessScreen(order: {
  order_number: number;
  total: number;
  estimated_minutes: number;
  already_completed?: boolean;
}): FlowScreenResponse {
  const headline = order.already_completed
    ? 'ההזמנה כבר נקלטה'
    : 'ההזמנה התקבלה בהצלחה!';
  const body = order.already_completed
    ? `ההזמנה שלך מספר #${order.order_number} כבר אצלנו בטיפול.`
    : `מספר הזמנה: #${order.order_number}\nסכום: ${formatCurrencyILS(order.total)}\nזמן הכנה משוער: ${order.estimated_minutes} דקות.`;

  return {
    screen: 'SUCCESS',
    data: {
      headline,
      body,
      flow_token_param: 'completed',
      order_number_param: String(order.order_number),
    },
  };
}

export function buildPingResponse() {
  return { data: { status: 'active' } };
}

export function buildErrorScreen(message: string): FlowScreenResponse {
  return buildStoreSearchScreen({ error_message: message });
}
