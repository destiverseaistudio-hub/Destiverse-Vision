-- Admin-managed advertising. Ads contain text and media URLs only: arbitrary HTML
-- and scripts are deliberately not accepted in order to keep viewer sessions safe.
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  format text not null check (format in ('banner', 'popup', 'pre_roll', 'mid_roll', 'end_card')),
  placement text not null check (placement in ('home', 'content', 'reels')),
  headline text not null check (char_length(trim(headline)) between 2 and 140),
  body text not null default '' check (char_length(body) <= 500),
  media_url text,
  video_url text,
  cta_label text not null default 'Learn more' check (char_length(trim(cta_label)) between 2 and 40),
  cta_url text,
  skip_after_seconds integer not null default 5 check (skip_after_seconds between 0 and 120),
  midroll_at_seconds integer not null default 30 check (midroll_at_seconds between 5 and 7200),
  frequency_cap_per_day integer not null default 3 check (frequency_cap_per_day between 1 and 20),
  priority integer not null default 0 check (priority between -100 and 100),
  active boolean not null default false,
  premium_visible boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (video_url is not null or media_url is not null or char_length(trim(body)) > 0)
);

create table if not exists public.ad_events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'skipped', 'complete')),
  created_at timestamptz not null default now()
);

create index if not exists ad_campaigns_active_schedule_idx on public.ad_campaigns (placement, format, priority desc, starts_at desc) where active = true;
create index if not exists ad_events_campaign_created_idx on public.ad_events (campaign_id, created_at desc);

alter table public.ad_campaigns enable row level security;
alter table public.ad_events enable row level security;

drop policy if exists "View currently scheduled ads" on public.ad_campaigns;
drop policy if exists "Admins manage ad campaigns" on public.ad_campaigns;
drop policy if exists "Viewers record their ad events" on public.ad_events;
drop policy if exists "Admins read ad events" on public.ad_events;
create policy "View currently scheduled ads" on public.ad_campaigns for select to authenticated using (
  active and starts_at <= now() and (ends_at is null or ends_at > now())
);
create policy "Admins manage ad campaigns" on public.ad_campaigns for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Viewers record their ad events" on public.ad_events for insert to authenticated with check (user_id = auth.uid());
create policy "Admins read ad events" on public.ad_events for select to authenticated using (public.is_admin());

alter table public.ad_campaigns replica identity full;
do $$ begin alter publication supabase_realtime add table public.ad_campaigns; exception when duplicate_object then null; end $$;
