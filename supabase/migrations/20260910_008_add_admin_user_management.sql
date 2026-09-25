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
    u.id,
    u.email::text,
    p.display_name,
    coalesce(r.role, 'user')::text,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles r on r.user_id = u.id
  order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if new_role = 'admin' then
    insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id) do update set role = 'admin';
  elsif new_role = 'user' then
    delete from public.user_roles where user_id = target_user_id;
  else
    raise exception 'Unsupported role';
  end if;
end;
$$;

grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
