-- Coins are optional. The first 20 Vision Guide replies per UTC day remain
-- free. A viewer can explicitly opt into a 2-Coin extra reply after that.
-- All balance changes and ledger records happen atomically in this function.
drop function if exists public.consume_viewer_ai_request();
create function public.consume_viewer_ai_request(p_use_coins boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare free_count integer;
declare wallet_balance integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.viewer_ai_daily_usage (user_id, usage_date, request_count)
  values (auth.uid(), current_date, 0)
  on conflict (user_id, usage_date) do nothing;

  select request_count into free_count
  from public.viewer_ai_daily_usage
  where user_id = auth.uid() and usage_date = current_date
  for update;

  if free_count < 20 then
    update public.viewer_ai_daily_usage
    set request_count = request_count + 1
    where user_id = auth.uid() and usage_date = current_date;
    return true;
  end if;

  if not p_use_coins then return false; end if;

  select balance into wallet_balance
  from public.user_coin_wallets
  where user_id = auth.uid()
  for update;
  if coalesce(wallet_balance, 0) < 2 then
    raise exception 'You need 2 Coins for one extra Vision Guide reply';
  end if;

  update public.user_coin_wallets
  set balance = balance - 2, updated_at = now()
  where user_id = auth.uid();
  insert into public.coin_ledger (user_id, amount, reason)
  values (auth.uid(), -2, 'One extra Vision Guide reply');
  return true;
end;
$$;
revoke all on function public.consume_viewer_ai_request(boolean) from public;
grant execute on function public.consume_viewer_ai_request(boolean) to authenticated;
