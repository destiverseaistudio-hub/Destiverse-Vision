-- Supabase Free projects have a 50 MB global upload ceiling. Keep the creator
-- bucket and the browser validation aligned with that ceiling.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime']::text[]
where id = 'creator-reels';
