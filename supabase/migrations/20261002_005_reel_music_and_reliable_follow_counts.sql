-- Music can be selected from the managed app library or uploaded for one Reel.
create table if not exists public.reel_music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  audio_url text not null unique,
  creator_id uuid references auth.users(id) on delete set null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reel_music_tracks_public_idx on public.reel_music_tracks (created_at desc) where is_public;
alter table public.reel_music_tracks enable row level security;
drop policy if exists "Public Reel music library" on public.reel_music_tracks;
drop policy if exists "Creators manage own Reel music" on public.reel_music_tracks;
drop policy if exists "Admins manage Reel music" on public.reel_music_tracks;
create policy "Public Reel music library" on public.reel_music_tracks for select using (is_public or creator_id = auth.uid() or public.is_admin());
create policy "Creators manage own Reel music" on public.reel_music_tracks for insert to authenticated with check (creator_id = auth.uid());
create policy "Admins manage Reel music" on public.reel_music_tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.reel_submissions
  add column if not exists music_url text,
  add column if not exists music_track_id uuid references public.reel_music_tracks(id) on delete set null;

-- Public viewers can read audio only when it belongs to an approved Reel or a
-- managed public library track. Creators retain access to their own files.
drop policy if exists "View approved reel media" on storage.objects;
create policy "View approved reel media" on storage.objects for select using (
  bucket_id = 'creator-reels' and (
    exists (select 1 from public.reel_submissions where status = 'approved' and (video_url = name or poster_url = name or music_url = name))
    or exists (select 1 from public.reel_music_tracks where is_public and audio_url = name)
  )
);

update storage.buckets
set allowed_mime_types = array[
  'video/mp4', 'video/webm', 'video/quicktime',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/heic', 'image/heif', 'image/svg+xml',
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm'
]::text[]
where id = 'creator-reels';

-- Counts run in a controlled function because the follow table intentionally
-- hides follower identities from other viewers through RLS.
create or replace function public.get_creator_profile_follow_counts(p_creator_id uuid)
returns table (followers bigint, following bigint)
language sql security definer set search_path = public as $$
  select
    (select count(*) from public.reel_creator_follows where creator_id = p_creator_id),
    (select count(*) from public.reel_creator_follows where follower_id = p_creator_id);
$$;
revoke all on function public.get_creator_profile_follow_counts(uuid) from public;
grant execute on function public.get_creator_profile_follow_counts(uuid) to authenticated;
