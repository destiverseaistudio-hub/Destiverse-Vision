-- Paystack can notify the webhook while the browser is verifying the same
-- reference.  A provider reference must therefore be able to credit Coins
-- exactly once, independently of which confirmation path wins the race.
create unique index if not exists coin_ledger_provider_reference_unique
  on public.coin_ledger (provider_reference)
  where provider_reference is not null;

create or replace function public.credit_payment_coins(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_provider_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare credited_amount integer;
begin
  if p_amount <= 0 or nullif(trim(p_provider_reference), '') is null then
    raise exception 'A positive amount and payment reference are required';
  end if;

  insert into public.coin_ledger (user_id, amount, reason, provider_reference)
  values (p_user_id, p_amount, trim(p_reason), p_provider_reference)
  on conflict (provider_reference) where provider_reference is not null do nothing
  returning amount into credited_amount;

  if credited_amount is null then
    return false;
  end if;

  insert into public.user_coin_wallets (user_id, balance, updated_at)
  values (p_user_id, credited_amount, now())
  on conflict (user_id) do update
    set balance = public.user_coin_wallets.balance + excluded.balance,
        updated_at = now();
  return true;
end;
$$;

revoke all on function public.credit_payment_coins(uuid, integer, text, text) from public;
grant execute on function public.credit_payment_coins(uuid, integer, text, text) to service_role;
