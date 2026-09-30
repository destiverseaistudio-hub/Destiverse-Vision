-- Permanent deletion is separate from rejection: it removes the Reel's
-- private source file as well as its database record and dependent rows.
drop policy if exists "Admins delete reel media" on storage.objects;
create policy "Admins delete reel media"
on storage.objects for delete to authenticated
using (bucket_id = 'creator-reels' and public.is_admin());
