-- Paystack checkout records. No client can grant Coins or Premium directly.
alter table public.dv_subscription_plans
  add column if not exists duration_days integer not null default 30 check (duration_days between 1 and 366);

create table if not exists public.dv_coin_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coins integer not null check (coins > 0),
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'NGN' check (char_length(currency) = 3),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('membership', 'coins')),
  plan_id uuid references public.dv_subscription_plans(id) on delete set null,
  coin_product_id uuid references public.dv_coin_products(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'abandoned')),
  provider_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((purpose = 'membership' and plan_id is not null and coin_product_id is null) or (purpose = 'coins' and coin_product_id is not null and plan_id is null))
);
create index if not exists payment_orders_user_created_idx on public.payment_orders (user_id, created_at desc);

alter table public.dv_coin_products enable row level security;
alter table public.payment_orders enable row level security;
drop policy if exists "Public active coin products readable" on public.dv_coin_products;
drop policy if exists "Admins manage coin products" on public.dv_coin_products;
drop policy if exists "Users read own payment orders" on public.payment_orders;
drop policy if exists "Admins manage payment orders" on public.payment_orders;
create policy "Public active coin products readable" on public.dv_coin_products for select using (active or public.is_admin());
create policy "Admins manage coin products" on public.dv_coin_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users read own payment orders" on public.payment_orders for select to authenticated using (user_id = auth.uid());
create policy "Admins manage payment orders" on public.payment_orders for all to authenticated using (public.is_admin()) with check (public.is_admin());
