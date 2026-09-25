-- Per-account preferences are server-backed so they follow a person across
-- devices. Browser-only offline files remain on the device by design.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  autoplay boolean not null default false,
  reduced_data boolean not null default false,
  email_updates boolean not null default false,
  notifications_enabled boolean not null default true,
  creator_updates boolean not null default true,
  payment_updates boolean not null default true,
  captions_enabled boolean not null default false,
  playback_speed numeric(3,2) not null default 1 check (playback_speed in (0.75, 1, 1.25, 1.5, 2)),
  video_quality text not null default 'auto' check (video_quality in ('auto', 'data_saver', 'high')),
  reduce_motion boolean not null default false,
  profile_visibility text not null default 'public' check (profile_visibility in ('public', 'private')),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'open' check (status in ('open', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

alter table public.user_preferences enable row level security;
alter table public.account_deletion_requests enable row level security;
drop policy if exists "Users manage own preferences" on public.user_preferences;
drop policy if exists "Users create own deletion request" on public.account_deletion_requests;
drop policy if exists "Users read own deletion request" on public.account_deletion_requests;
drop policy if exists "Users cancel own deletion request" on public.account_deletion_requests;
drop policy if exists "Admins manage deletion requests" on public.account_deletion_requests;
create policy "Users manage own preferences" on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users create own deletion request" on public.account_deletion_requests for insert to authenticated with check (user_id = auth.uid());
create policy "Users read own deletion request" on public.account_deletion_requests for select to authenticated using (user_id = auth.uid());
create policy "Users cancel own deletion request" on public.account_deletion_requests for update to authenticated using (user_id = auth.uid() and status = 'open') with check (user_id = auth.uid() and status = 'cancelled');
create policy "Admins manage deletion requests" on public.account_deletion_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
