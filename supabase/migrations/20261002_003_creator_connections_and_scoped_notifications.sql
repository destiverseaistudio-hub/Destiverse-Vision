-- Creator connections are returned through one owner-only RPC, so a creator
-- can see their own followers/following list without exposing viewer emails.
create or replace function public.list_my_creator_connections(p_view text)
returns table (user_id uuid, display_name text, handle text, avatar_url text, followed_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_view = 'followers' then
    return query select f.follower_id, coalesce(cp.display_name, p.display_name, 'DestiVerse viewer'), cp.handle, coalesce(cp.avatar_url, p.avatar_url), f.created_at
      from public.reel_creator_follows f left join public.creator_profiles cp on cp.user_id = f.follower_id left join public.profiles p on p.id = f.follower_id
      where f.creator_id = auth.uid() order by f.created_at desc;
  elsif p_view = 'following' then
    return query select f.creator_id, coalesce(cp.display_name, p.display_name, 'DestiVerse creator'), cp.handle, coalesce(cp.avatar_url, p.avatar_url), f.created_at
      from public.reel_creator_follows f join public.creator_profiles cp on cp.user_id = f.creator_id left join public.profiles p on p.id = f.creator_id
      where f.follower_id = auth.uid() order by f.created_at desc;
  else
    raise exception 'Unsupported connection view';
  end if;
end;
$$;
revoke all on function public.list_my_creator_connections(text) from public;
grant execute on function public.list_my_creator_connections(text) to authenticated;

-- Keep in-app creator activity private and personalised. Device delivery is
-- handled by notify-creator-event after the same preference checks.
create or replace function public.notify_creator_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare follower_name text;
begin
  if new.creator_id <> new.follower_id then
    select coalesce(cp.display_name, p.display_name, 'A viewer') into follower_name from public.profiles p left join public.creator_profiles cp on cp.user_id = p.id where p.id = new.follower_id;
    insert into public.user_notifications (user_id,title,message,action_url)
    values (new.creator_id, 'New follower', coalesce(follower_name, 'A viewer') || ' started following your creator profile.', '/dashboard/creator/' || new.creator_id::text);
  end if;
  return new;
end; $$;

create or replace function public.notify_reel_followers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' and new.visibility = 'public' then
    insert into public.user_notifications (user_id,title,message,action_url)
    select f.follower_id, 'New Reel from a creator you follow', new.title || ' is now available to watch.', '/dashboard/reels'
    from public.reel_creator_follows f left join public.user_preferences up on up.user_id = f.follower_id
    where f.creator_id = new.creator_id and coalesce(up.notifications_enabled, true) and coalesce(up.creator_updates, true);
  end if;
  return new;
end; $$;
drop trigger if exists notify_reel_followers on public.reel_submissions;
create trigger notify_reel_followers after update on public.reel_submissions for each row execute function public.notify_reel_followers();

create or replace function public.notify_catalog_publish()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if new.published = true and (tg_op = 'INSERT' or old.published is distinct from true) then
    insert into public.user_notifications (user_id,title,message,action_url)
    select u.id, 'New on DestiVerse Vision', new.title || ' is now available to watch.', '/dashboard/content/' || new.id
    from auth.users u left join public.user_preferences up on up.user_id = u.id
    where coalesce(up.notifications_enabled, true) and coalesce(up.push_app_updates, true);
  end if;
  return new;
end; $$;
drop trigger if exists notify_catalog_publish on public.content;
create trigger notify_catalog_publish after insert or update of published on public.content for each row execute function public.notify_catalog_publish();
