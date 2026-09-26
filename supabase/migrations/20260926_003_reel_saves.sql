-- Persist a viewer's saved Reels without reusing movie/series watchlist rows.
create table if not exists public.reel_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.reel_submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, reel_id)
);

create index if not exists reel_saves_user_created_idx on public.reel_saves (user_id, created_at desc);

alter table public.reel_saves enable row level security;
create policy "Users manage own Reel saves" on public.reel_saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
