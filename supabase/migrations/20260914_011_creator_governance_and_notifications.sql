-- Per-account notices and creator governance. Email records are an outbox for a
-- future provider integration; they are not presented as delivered email.
alter table public.creator_profiles add column if not exists creator_tutorial_seen_at timestamptz;
alter table public.creator_applications drop constraint if exists creator_applications_status_check;
alter table public.creator_applications add constraint creator_applications_status_check check (status in ('pending', 'approved', 'declined', 'suspended'));

create table if not exists public.reel_creator_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, message text not null, action_url text, read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  template text not null, subject text not null, payload jsonb not null default '{}'::jsonb, status text not null default 'pending' check (status in ('pending','sent','failed')), created_at timestamptz not null default now()
);

alter table public.reel_creator_follows enable row level security;
alter table public.user_notifications enable row level security;
alter table public.email_outbox enable row level security;
drop policy if exists "Users manage own creator follows" on public.reel_creator_follows;
drop policy if exists "Users read own notices" on public.user_notifications;
drop policy if exists "Users mark own notices read" on public.user_notifications;
drop policy if exists "Admins manage creator notices" on public.user_notifications;
drop policy if exists "Admins manage email outbox" on public.email_outbox;
create policy "Users manage own creator follows" on public.reel_creator_follows for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "Users read own notices" on public.user_notifications for select to authenticated using (user_id = auth.uid());
create policy "Users mark own notices read" on public.user_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins manage creator notices" on public.user_notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage email outbox" on public.email_outbox for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.notify_creator_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.user_notifications (user_id,title,message,action_url) values (new.user_id,'Creator access is active','Welcome to DestiVerse Creator Mode. Upload up to 10 Reels per day, post only content you have rights to share, and keep every Reel safe and respectful.','/dashboard/create-reel');
    insert into public.email_outbox (user_id,template,subject,payload) values (new.user_id,'creator_access','Your DestiVerse Creator access is active',jsonb_build_object('guidelines','10 Reels per day; rights-owned, safe, respectful content only.'));
  end if;
  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    insert into public.user_notifications (user_id,title,message,action_url) values (new.user_id,'Creator uploads paused','Your creator uploads are temporarily paused because the daily 10-Reel limit was exceeded. Request an admin review to restore access.','/dashboard/create-reel');
  end if;
  return new;
end; $$;
drop trigger if exists notify_creator_access on public.creator_applications;
create trigger notify_creator_access after update on public.creator_applications for each row execute function public.notify_creator_access();

create or replace function public.enforce_creator_daily_reel_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare today_count integer;
begin
  select count(*) into today_count from public.reel_submissions where creator_id = new.creator_id and created_at >= date_trunc('day', now());
  if today_count > 10 then
    update public.creator_applications set status = 'suspended', review_note = 'Automatically paused after exceeding the daily 10-Reel upload limit.', reviewed_at = now() where user_id = new.creator_id and status = 'approved';
    update public.reel_submissions set status = 'removed', moderation_note = 'Upload limit exceeded. Creator access is paused pending review.' where id = new.id;
  end if;
  return new;
end; $$;
drop trigger if exists enforce_creator_daily_reel_limit on public.reel_submissions;
create trigger enforce_creator_daily_reel_limit after insert on public.reel_submissions for each row execute function public.enforce_creator_daily_reel_limit();

alter table public.reel_creator_follows replica identity full;
alter table public.user_notifications replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.reel_creator_follows;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception when duplicate_object then null;
end $$;
