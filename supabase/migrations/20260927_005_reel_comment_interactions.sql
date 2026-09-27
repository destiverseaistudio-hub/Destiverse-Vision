-- Public, persistent Reel comment identity and interactions.
-- The author name is stored on each comment so every viewer sees the same name
-- without opening the private profiles table to the public.
alter table public.reel_comments
  add column if not exists author_name text not null default 'User',
  add column if not exists sticker text,
  add column if not exists parent_comment_id uuid references public.reel_comments(id) on delete cascade;

alter table public.reel_comments
  drop constraint if exists reel_comments_sticker_length;
alter table public.reel_comments
  add constraint reel_comments_sticker_length check (sticker is null or char_length(sticker) between 1 and 32);

create index if not exists reel_comments_reel_parent_created_idx
  on public.reel_comments (reel_id, parent_comment_id, created_at desc);

create table if not exists public.reel_comment_reactions (
  comment_id uuid not null references public.reel_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists reel_comment_reactions_comment_created_idx
  on public.reel_comment_reactions (comment_id, created_at desc);

alter table public.reel_comment_reactions enable row level security;

drop policy if exists "Public comment reactions readable" on public.reel_comment_reactions;
create policy "Public comment reactions readable" on public.reel_comment_reactions
  for select using (true);

drop policy if exists "Users add own comment reactions" on public.reel_comment_reactions;
create policy "Users add own comment reactions" on public.reel_comment_reactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Users remove own comment reactions" on public.reel_comment_reactions;
create policy "Users remove own comment reactions" on public.reel_comment_reactions
  for delete to authenticated using (user_id = auth.uid());

alter table public.reel_comment_reactions replica identity full;
alter publication supabase_realtime add table public.reel_comment_reactions;
