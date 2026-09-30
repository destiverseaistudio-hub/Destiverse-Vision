-- Content-library uploads are administered media, not arbitrary documents.
-- Allow the common browser-compatible image and video MIME types used for
-- posters, hero artwork, and managed video playback.
update storage.buckets
set file_size_limit = 104857600,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'image/svg+xml', 'image/bmp', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'
    ]::text[]
where id = 'content-media';
