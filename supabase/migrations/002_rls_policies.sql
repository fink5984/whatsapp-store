-- =============================================================
-- WhatsApp Flow Shops — Row Level Security
--
-- Owners can manage only their own stores and their related data.
-- The WhatsApp Flow endpoint uses the service-role key and bypasses RLS.
-- =============================================================

-- helper: does the current authenticated user own this store?
create or replace function public.user_owns_store(p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store and s.owner_id = auth.uid()
  );
$$;

-- ---------- profiles ----------
alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile write" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (id = auth.uid());
create policy "own profile write" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- stores ----------
alter table public.stores enable row level security;

drop policy if exists "owner select stores" on public.stores;
drop policy if exists "owner insert stores" on public.stores;
drop policy if exists "owner update stores" on public.stores;
drop policy if exists "owner delete stores" on public.stores;

create policy "owner select stores" on public.stores
  for select using (owner_id = auth.uid());
create policy "owner insert stores" on public.stores
  for insert with check (owner_id = auth.uid());
create policy "owner update stores" on public.stores
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete stores" on public.stores
  for delete using (owner_id = auth.uid());

-- ---------- generic per-store policies ----------
-- The same pattern repeats for every table scoped by store_id.
do $$
declare t text;
begin
  for t in select unnest(array[
    'store_opening_hours',
    'categories',
    'products',
    'option_groups',
    'options',
    'product_option_groups',
    'delivery_zones',
    'orders',
    'store_notifications'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner all %I" on public.%I', t, t);
    execute format(
      'create policy "owner all %I" on public.%I for all using (user_owns_store(store_id)) with check (user_owns_store(store_id))',
      t, t
    );
  end loop;
end $$;

-- ---------- order_items / order_item_options ----------
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;

drop policy if exists "owner read order_items" on public.order_items;
create policy "owner read order_items" on public.order_items
  for all
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and user_owns_store(o.store_id)))
  with check (exists (select 1 from public.orders o where o.id = order_items.order_id and user_owns_store(o.store_id)));

drop policy if exists "owner read order_item_options" on public.order_item_options;
create policy "owner read order_item_options" on public.order_item_options
  for all
  using (exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_options.order_item_id and user_owns_store(o.store_id)
  ))
  with check (exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.id = order_item_options.order_item_id and user_owns_store(o.store_id)
  ));

-- ---------- customers ----------
-- Customers are shared globally; owners can read them via their own orders only.
alter table public.customers enable row level security;
drop policy if exists "owner read customers" on public.customers;
create policy "owner read customers" on public.customers
  for select using (
    exists (
      select 1 from public.orders o
      where o.customer_id = customers.id and user_owns_store(o.store_id)
    )
  );

-- ---------- flow_sessions ----------
-- Only the service role (WhatsApp Flow endpoint) touches flow_sessions.
alter table public.flow_sessions enable row level security;
-- intentionally NO policies for authenticated/anon — locked down by default.

-- ---------- storage policies for the public store-assets bucket ----------
-- Allow public read; only the store owner can upload/manage files under store/<store_id>/...
drop policy if exists "public read store-assets" on storage.objects;
create policy "public read store-assets" on storage.objects
  for select using (bucket_id = 'store-assets');

drop policy if exists "owner write store-assets" on storage.objects;
create policy "owner write store-assets" on storage.objects
  for insert with check (
    bucket_id = 'store-assets'
    and auth.role() = 'authenticated'
    and (
      -- path begins with stores/<store_id>/...
      split_part(name, '/', 1) = 'stores'
      and user_owns_store((split_part(name, '/', 2))::uuid)
    )
  );

drop policy if exists "owner update store-assets" on storage.objects;
create policy "owner update store-assets" on storage.objects
  for update using (
    bucket_id = 'store-assets'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = 'stores'
    and user_owns_store((split_part(name, '/', 2))::uuid)
  );

drop policy if exists "owner delete store-assets" on storage.objects;
create policy "owner delete store-assets" on storage.objects
  for delete using (
    bucket_id = 'store-assets'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = 'stores'
    and user_owns_store((split_part(name, '/', 2))::uuid)
  );
