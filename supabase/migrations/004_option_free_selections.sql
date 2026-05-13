-- option_groups can declare "first N selections are free"; selections beyond N
-- are billed at their normal price_delta. Used by stores that import from
-- Wolt-like platforms where each item's option ref carries this value.

alter table public.option_groups
  add column if not exists free_selections int not null default 0
  check (free_selections >= 0);
