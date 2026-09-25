-- Viewer-visible membership status and a safe cancellation preference.
alter table public.dv_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancelled_at timestamptz;

create or replace function public.cancel_own_membership_at_period_end()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.dv_subscriptions
    set cancel_at_period_end = true, cancelled_at = now(), updated_at = now()
    where user_id = auth.uid() and status = 'active' and (expires_at is null or expires_at > now());
end;
$$;
revoke all on function public.cancel_own_membership_at_period_end() from public;
grant execute on function public.cancel_own_membership_at_period_end() to authenticated;
