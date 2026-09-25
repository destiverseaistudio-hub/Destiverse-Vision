insert into storage.buckets (id, name, public)
values ('content-media', 'content-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view content media" on storage.objects;
create policy "Public can view content media"
on storage.objects for select
using (bucket_id = 'content-media');

drop policy if exists "Admins can upload content media" on storage.objects;
create policy "Admins can upload content media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'content-media' and public.is_admin());

drop policy if exists "Admins can update content media" on storage.objects;
create policy "Admins can update content media"
on storage.objects for update
to authenticated
using (bucket_id = 'content-media' and public.is_admin())
with check (bucket_id = 'content-media' and public.is_admin());

drop policy if exists "Admins can delete content media" on storage.objects;
create policy "Admins can delete content media"
on storage.objects for delete
to authenticated
using (bucket_id = 'content-media' and public.is_admin());