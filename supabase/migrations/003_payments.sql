-- ---------- payments ----------
-- A payment intent for a WhatsApp Flow order. The flow creates the order
-- (payment_status='unpaid') and a matching payments row (status='pending')
-- before redirecting the customer to the provider's hosted page. The
-- provider notifies us via /api/webhooks/payment which flips status to
-- 'paid' and sets transaction_id atomically with orders.payment_status.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  flow_token text,
  amount numeric(10,2) not null,
  currency text not null default 'ILS',
  provider text not null default 'demo',
  provider_payment_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','cancelled')),
  transaction_id text,
  paid_at timestamptz,
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each order can have at most ONE active (pending/paid) payment row.
-- A cancelled/failed row leaves the slot free so the customer can retry.
create unique index if not exists payments_order_active_uniq
  on public.payments(order_id)
  where status in ('pending','paid');

create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_flow_token_idx on public.payments(flow_token);
create index if not exists payments_transaction_idx on public.payments(transaction_id);

drop trigger if exists trg_updated_payments on public.payments;
create trigger trg_updated_payments before update on public.payments
  for each row execute function public.set_updated_at();

-- RLS — service role only. The webhook + flow handler both use the service
-- role key; no end-user direct access.
alter table public.payments enable row level security;
drop policy if exists payments_service_all on public.payments;
create policy payments_service_all on public.payments
  for all to service_role using (true) with check (true);
