-- Keep the administrator user directory independent of browser access to
-- auth.users. The security-definer function runs with database privileges,
-- but still checks the requesting user's admin role through auth.uid().
create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text,
    p.display_name,
    coalesce(r.role, 'user')::text,
    u.created_at
  from auth.users as u
  left join public.profiles as p on p.id = u.id
  left join public.user_roles as r on r.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
