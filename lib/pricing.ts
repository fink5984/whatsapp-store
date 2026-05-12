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

/** total for a single cart item, including its options, multiplied by quantity */
export function calculateItemTotal(
  product: Pick<Product, 'price'>,
  selectedOptions: CartItemOption[],
  quantity: number,
) {
  const safeQty = Math.max(1, Math.floor(quantity));
  const optionsTotal = (selectedOptions ?? []).reduce(
    (sum, opt) => sum + Number(opt.price_delta || 0),
    0,
  );
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
