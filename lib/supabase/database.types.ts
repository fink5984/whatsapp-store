/**
 * Minimal hand-written types matching the schema in
 * supabase/migrations/001_initial_schema.sql.
 *
 * For full type generation run:
 *   npx supabase gen types typescript --project-id <id> --schema public
 * and replace this file.
 */

export type UUID = string;
export type ISO = string;

export interface Profile {
  id: UUID;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: ISO;
}

export interface Store {
  id: UUID;
  owner_id: UUID;
  name: string;
  slug: string;
  store_code: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  category: string | null;
  kosher_type: string | null;
  is_active: boolean;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  minimum_order: number;
  default_delivery_fee: number;
  estimated_preparation_minutes: number;
  sort_order: number;
  created_at: ISO;
  updated_at: ISO;
}

export interface StoreOpeningHours {
  id: UUID;
  store_id: UUID;
  day_of_week: number; // 0..6 — Sunday = 0
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface Category {
  id: UUID;
  store_id: UUID;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: ISO;
}

export interface Product {
  id: UUID;
  store_id: UUID;
  category_id: UUID | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sku: string | null;
  is_active: boolean;
  is_available: boolean;
  is_featured: boolean;
  badge: string | null;
  sort_order: number;
  allow_note: boolean;
  max_quantity_per_order: number;
  created_at: ISO;
  updated_at: ISO;
}

export interface OptionGroup {
  id: UUID;
  store_id: UUID;
  name: string;
  description: string | null;
  type: string | null;
  min_select: number;
  max_select: number;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: ISO;
}

export interface Option {
  id: UUID;
  store_id: UUID;
  group_id: UUID;
  name: string;
  description: string | null;
  price_delta: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ProductOptionGroup {
  id: UUID;
  store_id: UUID;
  product_id: UUID;
  group_id: UUID;
}

export interface DeliveryZone {
  id: UUID;
  store_id: UUID;
  city: string;
  area_name: string | null;
  delivery_fee: number;
  minimum_order: number;
  estimated_minutes: number;
  is_active: boolean;
}

export interface Customer {
  id: UUID;
  phone: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  floor: string | null;
  apartment: string | null;
  entrance: string | null;
  notes: string | null;
  created_at: ISO;
  updated_at: ISO;
}

export interface CartItemOption {
  option_id: UUID;
  group_id?: UUID;
  group_name: string;
  option_name: string;
  price_delta: number;
}

export interface CartItem {
  cart_item_id: string;
  product_id: UUID;
  product_name: string;
  unit_price: number;
  quantity: number;
  options: CartItemOption[];
  options_total: number;
  note?: string | null;
  total_price: number;
}

export interface FlowSession {
  id: UUID;
  flow_token: string;
  store_id: UUID | null;
  customer_phone: string | null;
  cart_json: CartItem[];
  customer_json: Record<string, unknown>;
  current_screen: string | null;
  status: 'active' | 'completed' | string;
  created_at: ISO;
  updated_at: ISO;
  completed_at: ISO | null;
}

export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'out'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: UUID;
  store_id: UUID;
  customer_id: UUID | null;
  order_number: number;
  flow_token: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_type: 'delivery' | 'pickup';
  city: string | null;
  address: string | null;
  floor: string | null;
  apartment: string | null;
  entrance: string | null;
  customer_note: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_method: string | null;
  created_at: ISO;
  updated_at: ISO;
}

export interface OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: UUID | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
  options_total: number;
  total_price: number;
  note: string | null;
}

export interface OrderItemOption {
  id: UUID;
  order_item_id: UUID;
  option_id: UUID | null;
  group_name: string | null;
  option_name: string | null;
  price_delta: number;
}

export interface StoreNotification {
  id: UUID;
  store_id: UUID;
  channel: string;
  target: string;
  is_active: boolean;
}
