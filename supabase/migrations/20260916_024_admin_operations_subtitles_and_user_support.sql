-- Episodes and subtitles remain optional, so existing films continue working.
alter table public.content add column if not exists subtitles_url text;
alter table public.content add column if not exists episodes jsonb not null default '[]'::jsonb;

create or replace function public.admin_send_user_notification(p_user_id uuid, p_title text, p_message text, p_action_url text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare notice_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  insert into public.user_notifications (user_id, title, message, action_url) values (p_user_id, left(trim(p_title), 120), left(trim(p_message), 600), nullif(trim(p_action_url), '')) returning id into notice_id;
  return notice_id;
end; $$;
revoke all on function public.admin_send_user_notification(uuid, text, text, text) from public;
grant execute on function public.admin_send_user_notification(uuid, text, text, text) to authenticated;

create or replace function public.admin_grant_user_subscription(p_user_id uuid, p_plan_id uuid, p_duration_days integer default 1)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare expiry timestamptz;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_duration_days < 1 or p_duration_days > 3650 then raise exception 'Duration must be between 1 and 3650 days'; end if;
  select expires_at into expiry from public.dv_subscriptions where user_id = p_user_id;
  expiry := greatest(coalesce(expiry, now()), now()) + make_interval(days => p_duration_days);
  insert into public.dv_subscriptions (user_id, plan_id, status, expires_at, updated_at) values (p_user_id, p_plan_id, 'active', expiry, now())
  on conflict (user_id) do update set plan_id = excluded.plan_id, status = 'active', expires_at = excluded.expires_at, updated_at = now();
  perform public.admin_send_user_notification(p_user_id, 'Premium access updated', 'Your DestiVerse Premium access has been updated by support.', '/dashboard/membership');
  return expiry;
end; $$;
revoke all on function public.admin_grant_user_subscription(uuid, uuid, integer) from public;
grant execute on function public.admin_grant_user_subscription(uuid, uuid, integer) to authenticated;

create or replace function public.admin_process_account_deletion(p_request_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare request_row public.account_deletion_requests;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_action not in ('cancelled', 'completed') then raise exception 'Invalid action'; end if;
  select * into request_row from public.account_deletion_requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  update public.account_deletion_requests set status = p_action, reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id;
  insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details) values (auth.uid(), concat('account_deletion_', p_action), 'account_deletion_request', p_request_id::text, jsonb_build_object('user_id', request_row.user_id));
end; $$;
revoke all on function public.admin_process_account_deletion(uuid, text) from public;
grant execute on function public.admin_process_account_deletion(uuid, text) to authenticated;
