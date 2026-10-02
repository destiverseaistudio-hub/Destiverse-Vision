-- Reels can now be either a short video or a still image. Creative settings
-- are stored as metadata so the DestiVerse player can render them consistently.
alter table public.reel_submissions
  add column if not exists media_type text not null default 'video' check (media_type in ('video', 'image')),
  add column if not exists editor_settings jsonb not null default '{}'::jsonb,
  add column if not exists location_label text,
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision;

alter table public.reel_submissions
  drop constraint if exists reel_submission_location_coordinates_check;
alter table public.reel_submissions
  add constraint reel_submission_location_coordinates_check check (
    (location_latitude is null and location_longitude is null)
    or (location_latitude between -90 and 90 and location_longitude between -180 and 180)
  );

-- The same protected bucket stores the Reel, its vertical thumbnail, and
-- approved image Reels. Access remains tied to an approved submission.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'video/mp4', 'video/webm', 'video/quicktime',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'image/bmp', 'image/heic', 'image/heif', 'image/svg+xml'
    ]::text[]
where id = 'creator-reels';

drop policy if exists "View approved reel media" on storage.objects;
create policy "View approved reel media" on storage.objects for select using (
  bucket_id = 'creator-reels' and exists (
    select 1 from public.reel_submissions
    where status = 'approved' and (video_url = name or poster_url = name)
  )
);
