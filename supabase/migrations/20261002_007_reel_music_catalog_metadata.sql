-- Keep licence and attribution with every library track. This makes it clear
-- which catalog track is attached to a Reel and avoids presenting unknown
-- copyrighted audio as app music.
alter table public.reel_music_tracks
  add column if not exists artist_name text,
  add column if not exists provider text not null default 'destiverse',
  add column if not exists provider_track_id text,
  add column if not exists license_name text,
  add column if not exists license_url text,
  add column if not exists attribution_text text,
  add column if not exists preview_url text;

create unique index if not exists reel_music_tracks_provider_track_idx
  on public.reel_music_tracks (provider, provider_track_id)
  where provider_track_id is not null;

alter table public.reel_submissions
  add column if not exists music_attribution text;
