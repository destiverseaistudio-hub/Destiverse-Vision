-- Repair the viewer watchlist independently of older migrations. It is safe to
-- run more than once and grants no cross-user access.
create table if not exists public.watchlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.watchlist_items enable row level security;
drop policy if exists "Users manage their own watchlist" on public.watchlist_items;
create policy "Users manage their own watchlist"
on public.watchlist_items
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists watchlist_items_user_created_idx
on public.watchlist_items (user_id, created_at desc);
