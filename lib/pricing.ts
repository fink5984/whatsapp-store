import type { CartItem, CartItemOption, Product } from './supabase/database.types';

const ILS_FORMATTER = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

export function formatCurrencyILS(amount: number) {
  if (!Number.isFinite(amount)) return ILS_FORMATTER.format(0);
  return ILS_FORMATTER.format(amount);
}

/**
 * Sum the price_delta of selected options, honoring per-group free_selections.
 * Options are grouped by `group_id`; within each group the cheapest N
 * selections (where N = group_free_selections) are zeroed out and the rest
 * billed at their normal price_delta. Options without a group_id (legacy
 * entries) are summed without discount.
 */
export function calculateOptionsTotal(selectedOptions: CartItemOption[]): number {
  if (!selectedOptions?.length) return 0;
  const byGroup = new Map<string, CartItemOption[]>();
  let ungrouped = 0;
  for (const opt of selectedOptions) {
    if (!opt.group_id) {
      ungrouped += Number(opt.price_delta || 0);
      continue;
    }
    const arr = byGroup.get(opt.group_id) ?? [];
    arr.push(opt);
    byGroup.set(opt.group_id, arr);
  }
  let total = ungrouped;
  for (const opts of byGroup.values()) {
    const free = Math.max(0, opts[0]?.group_free_selections ?? 0);
    const sorted = [...opts].sort(
      (a, b) => Number(a.price_delta || 0) - Number(b.price_delta || 0),
    );
    for (let i = free; i < sorted.length; i++) {
      total += Number(sorted[i].price_delta || 0);
    }
  }
  return total;
}

/** total for a single cart item, including its options, multiplied by quantity */
export function calculateItemTotal(
  product: Pick<Product, 'price'>,
  selectedOptions: CartItemOption[],
  quantity: number,
) {
  const safeQty = Math.max(1, Math.floor(quantity));
  const optionsTotal = calculateOptionsTotal(selectedOptions ?? []);
  const perUnit = Number(product.price || 0) + optionsTotal;
  return {
    unit_price: Number(product.price || 0),
    options_total: optionsTotal,
    total_price: perUnit * safeQty,
    quantity: safeQty,
  };
}

export function calculateCartTotals(
  cart: CartItem[],
  deliveryFee = 0,
  discount = 0,
) {
  const subtotal = (cart ?? []).reduce((s, i) => s + Number(i.total_price || 0), 0);
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const itemCount = (cart ?? []).reduce((n, i) => n + i.quantity, 0);
  return { subtotal, delivery_fee: deliveryFee, discount, total, item_count: itemCount };
}
