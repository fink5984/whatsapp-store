-- =============================================================
-- WhatsApp Flow Shops — initial schema
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- stores ----------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  store_code text unique,
  description text,
  logo_url text,
  cover_image_url text,
  phone text,
  whatsapp_phone text,
  email text,
  city text,
  address text,
  category text,
  kosher_type text,
  is_active boolean not null default true,
  accepts_delivery boolean not null default true,
  accepts_pickup boolean not null default true,
  minimum_order numeric not null default 0 check (minimum_order >= 0),
  default_delivery_fee numeric not null default 0 check (default_delivery_fee >= 0),
  estimated_preparation_minutes int not null default 25 check (estimated_preparation_minutes >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stores_owner_idx on public.stores(owner_id);
create index if not exists stores_is_active_idx on public.stores(is_active);
create index if not exists stores_city_idx on public.stores(city);
create index if not exists stores_category_idx on public.stores(category);

-- ---------- store_opening_hours ----------
create table if not exists public.store_opening_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique (store_id, day_of_week)
);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists categories_store_idx on public.categories(store_id);

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  image_url text,
  sku text,
  is_active boolean not null default true,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  badge text,
  sort_order int not null default 0,
  allow_note boolean not null default true,
  max_quantity_per_order int not null default 20 check (max_quantity_per_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_store_idx on public.products(store_id);
create index if not exists products_category_idx on public.products(category_id);

-- ---------- option_groups ----------
create table if not exists public.option_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  type text,
  min_select int not null default 0 check (min_select >= 0),
  max_select int not null default 10 check (max_select >= 0),
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists option_groups_store_idx on public.option_groups(store_id);

-- ---------- options ----------
create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  group_id uuid not null references public.option_groups(id) on delete cascade,
  name text not null,
  description text,
  price_delta numeric not null default 0,
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index if not exists options_group_idx on public.options(group_id);
create index if not exists options_store_idx on public.options(store_id);

-- ---------- product_option_groups ----------
create table if not exists public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  group_id uuid not null references public.option_groups(id) on delete cascade,
  unique (product_id, group_id)
);

create index if not exists pog_product_idx on public.product_option_groups(product_id);

-- ---------- delivery_zones ----------
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  city text not null,
  area_name text,
  delivery_fee numeric not null default 0 check (delivery_fee >= 0),
  minimum_order numeric not null default 0 check (minimum_order >= 0),
  estimated_minutes int not null default 45 check (estimated_minutes >= 0),
  is_active boolean not null default true
);

create index if not exists dz_store_idx on public.delivery_zones(store_id);
create index if not exists dz_city_idx on public.delivery_zones(city);

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  full_name text,
  email text,
  city text,
  address text,
  floor text,
  apartment text,
  entrance text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone)
);

-- ---------- flow_sessions ----------
create table if not exists public.flow_sessions (
  id uuid primary key default gen_random_uuid(),
  flow_token text not null unique,
  store_id uuid references public.stores(id) on delete set null,
  customer_phone text,
  cart_json jsonb not null default '[]'::jsonb,
  customer_json jsonb not null default '{}'::jsonb,
  current_screen text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists flow_sessions_token_idx on public.flow_sessions(flow_token);
create index if not exists flow_sessions_store_idx on public.flow_sessions(store_id);

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_number bigserial,
  flow_token text unique,
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_type text not null default 'delivery' check (delivery_type in ('delivery','pickup')),
  city text,
  address text,
  floor text,
  apartment text,
  entrance text,
  customer_note text,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'new' check (status in ('new','preparing','ready','out','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_store_idx on public.orders(store_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric not null default 0,
  options_total numeric not null default 0,
  total_price numeric not null default 0,
  note text
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- order_item_options ----------
create table if not exists public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  option_id uuid references public.options(id) on delete set null,
  group_name text,
  option_name text,
  price_delta numeric not null default 0
);

create index if not exists oio_item_idx on public.order_item_options(order_item_id);

-- ---------- store_notifications ----------
create table if not exists public.store_notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null,
  target text not null,
  is_active boolean not null default true
);

create index if not exists sn_store_idx on public.store_notifications(store_id);

-- ---------- updated_at triggers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  for t in select unnest(array['stores','products','customers','flow_sessions','orders'])
  loop
    execute format('drop trigger if exists trg_updated_%I on public.%I', t, t);
    execute format('create trigger trg_updated_%I before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- storage bucket for store assets ----------
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;
