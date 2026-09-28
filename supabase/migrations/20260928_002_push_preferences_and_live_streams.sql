-- Granular, opt-in delivery choices. Phone delivery only occurs for an active
-- browser push subscription and never overrides these choices.
alter table public.user_preferences
  add column if not exists push_app_updates boolean not null default true,
  add column if not exists push_new_reels boolean not null default true,
  add column if not exists push_reel_likes boolean not null default true,
  add column if not exists push_new_followers boolean not null default true,
  add column if not exists push_comments boolean not null default true;

create table if not exists public.creator_live_streams (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 500),
  stream_uid text not null unique,
  playback_url text not null,
  thumbnail_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists creator_live_streams_live_idx on public.creator_live_streams (status, started_at desc);
alter table public.creator_live_streams enable row level security;
create policy "Public read live creator streams" on public.creator_live_streams for select using (status in ('scheduled', 'live') or creator_id = auth.uid() or public.is_admin());
create policy "Creators manage own live streams" on public.creator_live_streams for all to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- In-app notices are durable even if a phone has no push subscription.
create or replace function public.notify_creator_reel_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if new.reaction = 'love' then
    select creator_id into owner_id from public.reel_submissions where id = new.reel_id;
    if owner_id is not null and owner_id <> new.user_id then
      insert into public.user_notifications (user_id,title,message,action_url)
      values (owner_id, 'New Reel like', 'Someone liked one of your Reels.', '/dashboard/creator/' || owner_id::text);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists notify_creator_reel_like on public.reel_reactions;
create trigger notify_creator_reel_like after insert on public.reel_reactions for each row execute function public.notify_creator_reel_like();

create or replace function public.notify_creator_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.creator_id <> new.follower_id then
    insert into public.user_notifications (user_id,title,message,action_url)
    values (new.creator_id, 'New follower', 'A viewer started following your creator profile.', '/dashboard/creator/' || new.creator_id::text);
  end if;
  return new;
end; $$;
drop trigger if exists notify_creator_follow on public.reel_creator_follows;
create trigger notify_creator_follow after insert on public.reel_creator_follows for each row execute function public.notify_creator_follow();
