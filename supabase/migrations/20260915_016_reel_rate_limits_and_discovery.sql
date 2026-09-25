-- Abuse controls belong in the database so they apply to every client, not only
-- the current web interface. Limits are deliberately modest for a new community.
create or replace function public.enforce_reel_action_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_actions integer;
  actor uuid;
begin
  actor := case tg_table_name
    when 'reel_comments' then new.user_id
    when 'reel_creator_follows' then new.follower_id
    else new.reporter_id
  end;

  if tg_table_name = 'reel_comments' then
    select count(*) into recent_actions from public.reel_comments
      where user_id = actor and created_at > now() - interval '1 minute';
    if recent_actions >= 5 then
      raise exception 'Comment limit reached. Please wait a minute before commenting again.';
    end if;
  elsif tg_table_name = 'reel_creator_follows' then
    select count(*) into recent_actions from public.reel_creator_follows
      where follower_id = actor and created_at > now() - interval '1 hour';
    if recent_actions >= 30 then
      raise exception 'Follow limit reached. Please try again later.';
    end if;
  else
    execute format('select count(*) from public.%I where reporter_id = $1 and created_at > now() - interval ''24 hours''', tg_table_name)
      into recent_actions using actor;
    if recent_actions >= 10 then
      raise exception 'Report limit reached. Please try again tomorrow.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists limit_reel_comment_actions on public.reel_comments;
create trigger limit_reel_comment_actions before insert on public.reel_comments
for each row execute function public.enforce_reel_action_rate_limit();
drop trigger if exists limit_creator_follow_actions on public.reel_creator_follows;
create trigger limit_creator_follow_actions before insert on public.reel_creator_follows
for each row execute function public.enforce_reel_action_rate_limit();
drop trigger if exists limit_reel_report_actions on public.reel_reports;
create trigger limit_reel_report_actions before insert on public.reel_reports
for each row execute function public.enforce_reel_action_rate_limit();
drop trigger if exists limit_creator_report_actions on public.creator_profile_reports;
create trigger limit_creator_report_actions before insert on public.creator_profile_reports
for each row execute function public.enforce_reel_action_rate_limit();
drop trigger if exists limit_comment_report_actions on public.reel_comment_reports;
create trigger limit_comment_report_actions before insert on public.reel_comment_reports
for each row execute function public.enforce_reel_action_rate_limit();

create index if not exists reel_comments_user_created_idx on public.reel_comments (user_id, created_at desc);
create index if not exists reel_creator_follows_follower_created_idx on public.reel_creator_follows (follower_id, created_at desc);
create index if not exists reel_reports_reporter_created_idx on public.reel_reports (reporter_id, created_at desc);
create index if not exists creator_profile_reports_reporter_created_idx on public.creator_profile_reports (reporter_id, created_at desc);

-- Public discovery only returns active and discoverable creators. This supports
-- creator search without exposing private creator profiles.
create index if not exists creator_profiles_discovery_idx on public.creator_profiles (discoverable, handle);
