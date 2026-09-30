-- The administration console may upload common image and video formats. This
-- remains intentionally limited to browser-renderable media: arbitrary files
-- must not be placed in a public advertising bucket.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      'image/svg+xml', 'image/bmp', 'image/heic', 'image/heif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'
    ]::text[]
where id = 'ad-media';
