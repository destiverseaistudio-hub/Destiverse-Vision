-- Keep all viewer and creator profile avatars within the same safe upload limit.
update storage.buckets
set file_size_limit = 7340032,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'profile-avatars';
