-- Scheduled visibility is enforced both by RLS and by the public client query.
alter table public.content
  add column if not exists publish_at timestamptz,
  add column if not exists unpublish_at timestamptz;

alter table public.content
  add constraint content_publish_window_valid
  check (unpublish_at is null or publish_at is null or unpublish_at > publish_at);

drop policy if exists "Published content is publicly readable" on public.content;
create policy "Published content is publicly readable"
on public.content for select
using (
  public.is_admin()
  or (
    published = true
    and (publish_at is null or publish_at <= now())
    and (unpublish_at is null or unpublish_at > now())
  )
);

create index if not exists content_publish_window_idx
  on public.content (published, publish_at, unpublish_at);

create policy "Admins can read watchlist items"
on public.watchlist_items for select
to authenticated
using (public.is_admin());

create policy "Admins can read watch progress"
on public.watch_progress for select
to authenticated
using (public.is_admin());
