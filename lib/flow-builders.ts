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
import { fetchManyAsBase64 } from './image-base64';

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

export interface StoreResultsOpts {
  search?: { query?: string; city?: string; category?: string };
  selectedStoreId?: string;
}

export async function buildStoreResultsScreen(
  stores: Store[],
  opts: StoreResultsOpts = {},
): Promise<FlowScreenResponse> {
  if (stores.length === 0) {
    return buildStoreSearchScreen({
      error_message: 'לא נמצאו חנויות מתאימות. נסה לחפש בשם אחר.',
    });
  }
  const top = stores.slice(0, 10);
  const thumbs = await fetchManyAsBase64(top.map((s) => s.logo_url), 80);
  const items = top.map((s, i) => {
    const isSelected = !!opts.selectedStoreId && opts.selectedStoreId === s.id;
    const brief = [s.city, s.category].filter(Boolean).join(' · ');
    // For the selected store, bake the full info block straight into its
    // radio description so the details render *under that specific row*
    // rather than below the whole list (RadioButtonsGroup doesn't allow
    // inserting content between items).
    const description = isSelected
      ? truncate([brief, formatStoreDetails(s)].filter(Boolean).join('\n'), 300)
      : truncate(brief, 60);
    const item: Record<string, unknown> = {
      id: s.id,
      title: truncate(s.name, 60),
      description,
    };
    if (thumbs[i]) {
      item.image = thumbs[i];
      item['alt-text'] = s.name;
    }
    return item;
  });

  return {
    screen: 'STORE_RESULTS',
    data: {
      title: `נמצאו ${items.length} חנויות`,
      stores: items,
      query: opts.search?.query ?? '',
      city: opts.search?.city ?? '',
      category: opts.search?.category ?? '',
      selected_store_id: opts.selectedStoreId ?? '',
    },
  };
}

function formatStoreDetails(s: Store): string {
  const parts: string[] = [];
  if (s.description) parts.push(s.description);
  const channels = [
    s.accepts_delivery ? 'משלוחים' : null,
    s.accepts_pickup ? 'איסוף עצמי' : null,
  ].filter(Boolean).join(' · ');
  if (channels) parts.push(channels);
  if (s.estimated_preparation_minutes) {
    parts.push(`זמן הכנה משוער: ${s.estimated_preparation_minutes} דקות`);
  }
  if (s.minimum_order) parts.push(`מינימום הזמנה: ${formatCurrencyILS(s.minimum_order)}`);
  const addr = [s.address, s.city].filter(Boolean).join(', ');
  if (addr) parts.push(addr);
  return parts.join('\n');
}

export async function buildCategoryScreen(store: Store, categories: Category[]): Promise<FlowScreenResponse> {
  const top = categories.filter((c) => c.is_active).slice(0, 20);
  const thumbs = await fetchManyAsBase64(top.map((c) => c.image_url), 100);
  const items = top.map((c, i) => {
    const item: Record<string, unknown> = {
      id: c.id,
      title: truncate(c.name, 50),
      description: truncate(c.description ?? '', 60),
    };
    if (thumbs[i]) {
      item.image = thumbs[i];
      item['alt-text'] = c.name;
    }
    return item;
  });
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

export async function buildProductsScreen(
  store: Store,
  category: Category | null,
  products: Product[],
): Promise<FlowScreenResponse> {
  const top = products.filter((p) => p.is_active && p.is_available).slice(0, 20);
  const thumbs = await fetchManyAsBase64(top.map((p) => p.image_url), 120);
  const items = top.map((p, i) => {
    const item: Record<string, unknown> = {
      id: p.id,
      title: truncate(p.name, 50),
      description: truncate(p.description ?? '', 80),
      metadata: formatCurrencyILS(p.price),
    };
    if (thumbs[i]) {
      item.image = thumbs[i];
      item['alt-text'] = p.name;
    }
    return item;
  });
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

export async function buildProductCustomizeScreen(
  product: Product,
  optionGroups: { group: OptionGroup; options: Option[] }[],
  allowNote: boolean,
): Promise<FlowScreenResponse> {
  // Flow JSON has up to 5 statically defined groups; we control visibility/data
  // dynamically here.

  // Fetch all option thumbnails up-front in parallel
  const visibleGroups = optionGroups.slice(0, 5);
  const optionLists = visibleGroups.map(({ options }) =>
    options.filter((o) => o.is_active).slice(0, 10),
  );
  const allUrls = optionLists.flat().map((o) => o.image_url);
  const allThumbs = await fetchManyAsBase64(allUrls, 80);

  let cursor = 0;
  const groupsForFlow = visibleGroups.map(({ group, options: _opts }, idx) => {
    const opts = optionLists[idx];
    const built = opts.map((o) => {
      const thumb = allThumbs[cursor++];
      const item: Record<string, unknown> = {
        id: o.id,
        title: o.price_delta > 0
          ? `${truncate(o.name, 40)} (+${formatCurrencyILS(o.price_delta)})`
          : truncate(o.name, 50),
      };
      if (thumb) {
        item.image = thumb;
        item['alt-text'] = o.name;
      }
      return item;
    });
    return {
      index: idx + 1,
      visible: true,
      group_id: group.id,
      name: group.name,
      is_required: group.is_required,
      min_select: group.min_select,
      max_select: group.max_select,
      use_multi: group.max_select > 1,
      options: built,
    };
  });

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
      // Force-clear form fields each time the screen is rendered.
      // WhatsApp Flow keeps form state across navigations to the same screen
      // unless overridden by init-value.
      empty_array: [],
      empty_string: '',
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
  const items = cart.map((i) => {
    const opts = i.options.length ? ` (${i.options.map((o) => o.option_name).join(', ')})` : '';
    return {
      id: i.cart_item_id,
      title: truncate(`${i.quantity} × ${i.product_name}${opts}`, 80),
      description: formatCurrencyILS(i.total_price),
    };
  });

  return {
    screen: 'CART',
    data: {
      is_empty: cart.length === 0,
      has_items: cart.length > 0,
      items,
      item_count: totals.item_count,
      total_text: cart.length === 0 ? 'העגלה ריקה' : `סך הכל: ${formatCurrencyILS(totals.subtotal)}`,
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

export function buildPaymentPendingScreen(opts: {
  payment_id: string;
  order_id: string;
  store_id: string;
  payment_url: string;
  amount: number;
  error_message?: string;
}): FlowScreenResponse {
  const hasError = !!opts.error_message;
  return {
    screen: 'PAYMENT_PENDING',
    data: {
      headline: hasError ? 'התשלום עדיין לא אומת' : 'מעבר לתשלום',
      body: hasError
        ? 'אם השלמת את התשלום, לחץ שוב על "בדוק תשלום" עוד רגע. אחרת — פתח את דף התשלום והשלם אותו.'
        : 'פתח את דף התשלום המאובטח, השלם את התשלום, ואז חזור לכאן ולחץ על "בדוק תשלום".',
      payment_url: opts.payment_url,
      payment_id: opts.payment_id,
      order_draft_id: opts.order_id,
      store_id: opts.store_id,
      amount_text: `סכום לתשלום: ${formatCurrencyILS(opts.amount)}`,
      has_error: hasError,
      error_message: opts.error_message ?? '',
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

  // NOTE: screen id MUST NOT be "SUCCESS" — that's a WhatsApp Flow reserved
  // keyword that auto-closes the flow before the screen renders.
  return {
    screen: 'ORDER_CONFIRMED',
    data: {
      headline,
      body,
    },
  };
}

export function buildPingResponse() {
  return { data: { status: 'active' } };
}

export function buildErrorScreen(message: string): FlowScreenResponse {
  return buildStoreSearchScreen({ error_message: message });
}
