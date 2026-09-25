create table if not exists public.watchlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null references public.content(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.watchlist_items enable row level security;

drop policy if exists "Users manage their own watchlist" on public.watchlist_items;
create policy "Users manage their own watchlist"
on public.watchlist_items for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null references public.content(id) on delete cascade,
  position_seconds numeric not null default 0,
  duration_seconds numeric not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

alter table public.watch_progress enable row level security;

drop policy if exists "Users manage their own watch progress" on public.watch_progress;
create policy "Users manage their own watch progress"
on public.watch_progress for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.set_watch_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watch_progress_updated_at on public.watch_progress;
create trigger watch_progress_updated_at
before update on public.watch_progress
for each row execute function public.set_watch_progress_updated_at();
