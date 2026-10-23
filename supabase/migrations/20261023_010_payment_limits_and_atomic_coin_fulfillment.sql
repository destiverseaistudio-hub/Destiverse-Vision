-- Payment guardrails: keep Coin balances bounded, prevent pass stacking, and
-- ensure every provider-funded Coin credit is ledgered and applied atomically.
alter table public.user_coin_wallets drop constraint if exists user_coin_wallets_balance_check;
alter table public.user_coin_wallets add constraint user_coin_wallets_balance_check check (balance between 0 and 50000);

alter table public.dv_coin_products add constraint dv_coin_products_coins_limit check (coins between 1 and 50000);
alter table public.dv_coin_products add constraint dv_coin_products_price_limit check (price_cents between 1 and 100000000);

create or replace function public.credit_payment_coins(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_provider_reference text
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare credited_amount integer; current_balance integer;
begin
  if p_amount <= 0 or nullif(trim(p_provider_reference), '') is null then
    raise exception 'A positive amount and payment reference are required';
  end if;
  insert into public.coin_ledger (user_id, amount, reason, provider_reference)
  values (p_user_id, p_amount, trim(p_reason), p_provider_reference)
  on conflict (provider_reference) where provider_reference is not null do nothing
  returning amount into credited_amount;
  if credited_amount is null then return false; end if;
  select balance into current_balance from public.user_coin_wallets where user_id = p_user_id for update;
  if coalesce(current_balance, 0) + credited_amount > 50000 then
    raise exception 'Coin wallet limit of 50000 would be exceeded';
  end if;
  insert into public.user_coin_wallets (user_id, balance, updated_at)
  values (p_user_id, credited_amount, now())
  on conflict (user_id) do update set balance = public.user_coin_wallets.balance + excluded.balance, updated_at = now();
  return true;
end;
$$;

create or replace function public.purchase_ad_free_day()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare wallet_balance integer; pass_expires timestamptz; price integer := 30;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select expires_at into pass_expires from public.user_ad_free_passes where user_id = auth.uid() for update;
  if pass_expires > now() then raise exception 'An ad-free pass is already active'; end if;
  select balance into wallet_balance from public.user_coin_wallets where user_id = auth.uid() for update;
  if coalesce(wallet_balance, 0) < price then raise exception 'You need % Coins for one ad-free day', price; end if;
  update public.user_coin_wallets set balance = balance - price, updated_at = now() where user_id = auth.uid();
  pass_expires := now() + interval '1 day';
  insert into public.user_ad_free_passes (user_id, expires_at, updated_at) values (auth.uid(), pass_expires, now())
  on conflict (user_id) do update set expires_at = excluded.expires_at, updated_at = now();
  insert into public.coin_ledger (user_id, amount, reason) values (auth.uid(), -price, 'One-day ad-free pass');
  insert into public.user_notifications (user_id, title, message, action_url) values (auth.uid(), 'Ad-free day active', 'Your Coin pass has removed DestiVerse ads for 24 hours.', '/dashboard/membership');
  return pass_expires;
end;
$$;
