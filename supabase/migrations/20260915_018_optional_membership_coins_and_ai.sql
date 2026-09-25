-- Optional membership, virtual-coin accounting, and a guarded viewer AI quota.
-- Core DestiVerse viewing remains available without a subscription or coins.
alter table public.dv_subscription_plans
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists coins_included integer not null default 0 check (coins_included >= 0);

create table if not exists public.user_coin_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (char_length(trim(reason)) between 3 and 160),
  provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.viewer_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);

create index if not exists coin_ledger_user_created_idx on public.coin_ledger (user_id, created_at desc);

alter table public.user_coin_wallets enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.viewer_ai_daily_usage enable row level security;

drop policy if exists "Users read own coin wallet" on public.user_coin_wallets;
drop policy if exists "Users read own coin history" on public.coin_ledger;
drop policy if exists "Admins manage coin wallets" on public.user_coin_wallets;
drop policy if exists "Admins manage coin ledger" on public.coin_ledger;
create policy "Users read own coin wallet" on public.user_coin_wallets for select to authenticated using (user_id = auth.uid());
create policy "Users read own coin history" on public.coin_ledger for select to authenticated using (user_id = auth.uid());
create policy "Admins manage coin wallets" on public.user_coin_wallets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage coin ledger" on public.coin_ledger for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_adjust_coin_balance(p_user_id uuid, p_amount integer, p_reason text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare new_balance integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_amount = 0 or char_length(trim(p_reason)) < 3 then raise exception 'A non-zero amount and reason are required'; end if;
  select balance into new_balance from public.user_coin_wallets where user_id = p_user_id for update;
  if not found then
    if p_amount < 0 then raise exception 'Coin balance cannot become negative'; end if;
    insert into public.user_coin_wallets (user_id, balance) values (p_user_id, p_amount) returning balance into new_balance;
  else
    if new_balance + p_amount < 0 then raise exception 'Coin balance cannot become negative'; end if;
    update public.user_coin_wallets set balance = balance + p_amount, updated_at = now() where user_id = p_user_id returning balance into new_balance;
  end if;
  insert into public.coin_ledger (user_id, amount, reason) values (p_user_id, p_amount, trim(p_reason));
  return new_balance;
end;
$$;
revoke all on function public.admin_adjust_coin_balance(uuid, integer, text) from public;
grant execute on function public.admin_adjust_coin_balance(uuid, integer, text) to authenticated;

-- Called only by the authenticated Edge Function. It gives each viewer up to
-- 20 short assistant messages per UTC day without exposing the usage table.
create or replace function public.consume_viewer_ai_request()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare allowed boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.viewer_ai_daily_usage (user_id, usage_date, request_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.viewer_ai_daily_usage.request_count + 1
    where public.viewer_ai_daily_usage.request_count < 20
  returning true into allowed;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.consume_viewer_ai_request() from public;
grant execute on function public.consume_viewer_ai_request() to authenticated;
