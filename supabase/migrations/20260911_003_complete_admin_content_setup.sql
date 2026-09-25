-- Run this once in the production Supabase SQL Editor when older migrations
-- were not applied in order. Every operation is safe to repeat.

alter table public.content
  add column if not exists home_section text not null default 'DestiVerse Reels',
  add column if not exists section_order integer not null default 10,
  add column if not exists display_order integer not null default 0,
  add column if not exists poster_url text,
  add column if not exists hero_url text;

create index if not exists content_home_section_order_idx
  on public.content (published, section_order, display_order, updated_at desc);

alter table public.content
  drop constraint if exists content_type_check;

alter table public.content
  add constraint content_type_check check (
    type in (
      'Movie',
      'Series',
      'Short Film',
      'Documentary',
      'AI Video',
      'Dancing AI Video',
      'Podcast',
      'CEO & Business',
      'AI UGC',
      'Interview',
      'Music Video',
      'Tutorial',
      'Live Stream'
    )
  );

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

notify pgrst, 'reload schema';