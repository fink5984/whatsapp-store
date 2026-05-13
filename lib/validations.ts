import { z } from 'zod';

export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'slug חייב להכיל אותיות לטיניות קטנות, ספרות ומקפים בלבד');

export const storeSchema = z.object({
  name: z.string().min(1, 'שם חנות חובה').max(120),
  slug: slugSchema,
  store_code: z.string().max(20).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logo_url: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  cover_image_url: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  phone: z.string().max(40).optional().nullable(),
  whatsapp_phone: z.string().max(40).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  city: z.string().max(80).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  kosher_type: z.string().max(40).optional().nullable(),
  is_active: z.boolean().optional(),
  accepts_delivery: z.boolean().optional(),
  accepts_pickup: z.boolean().optional(),
  minimum_order: z.coerce.number().min(0).optional(),
  default_delivery_fee: z.coerce.number().min(0).optional(),
  estimated_preparation_minutes: z.coerce.number().int().min(0).optional(),
});

export type StoreInput = z.infer<typeof storeSchema>;

export const categorySchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1, 'שם חובה').max(80),
  description: z.string().max(1000).optional().nullable(),
  image_url: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  sort_order: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const productSchema = z.object({
  store_id: z.string().uuid(),
  category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'שם מוצר חובה').max(120),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().min(0, 'מחיר לא יכול להיות שלילי'),
  image_url: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  sku: z.string().max(40).optional().nullable(),
  is_active: z.boolean().optional(),
  is_available: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  badge: z.string().max(40).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).optional(),
  allow_note: z.boolean().optional(),
  max_quantity_per_order: z.coerce.number().int().min(1).max(99).optional(),
  option_group_ids: z.array(z.string().uuid()).optional(),
});

export const optionGroupSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(1000).optional().nullable(),
  min_select: z.coerce.number().int().min(0).optional(),
  max_select: z.coerce.number().int().min(0).optional(),
  free_selections: z.coerce.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export const optionSchema = z.object({
  store_id: z.string().uuid(),
  group_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  price_delta: z.coerce.number().optional(),
  image_url: z.preprocess((v) => (v === '' ? null : v), z.string().url().nullable().optional()),
  is_active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export const deliveryZoneSchema = z.object({
  store_id: z.string().uuid(),
  city: z.string().min(1).max(80),
  area_name: z.string().max(80).optional().nullable(),
  delivery_fee: z.coerce.number().min(0).optional(),
  minimum_order: z.coerce.number().min(0).optional(),
  estimated_minutes: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const orderStatusSchema = z.enum([
  'new',
  'preparing',
  'ready',
  'out',
  'completed',
  'cancelled',
]);
