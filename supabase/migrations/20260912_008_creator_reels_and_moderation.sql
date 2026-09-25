-- Creator Reels: viewers submit videos, admins approve them before discovery.
create table if not exists public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'), display_name text not null default '', bio text not null default '', avatar_url text,
  discoverable boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.reel_submissions (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  title text not null, caption text not null default '', video_url text not null, poster_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','removed')), moderation_note text not null default '',
  published_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.reel_reactions (
  reel_id uuid not null references public.reel_submissions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'love' check (reaction in ('love','fire','wow')), created_at timestamptz not null default now(), primary key (reel_id,user_id)
);
create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(), reel_id uuid not null references public.reel_submissions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500), created_at timestamptz not null default now(), hidden boolean not null default false
);
insert into storage.buckets (id,name,public) values ('creator-reels','creator-reels',false) on conflict (id) do update set public=false;
alter table public.creator_profiles enable row level security; alter table public.reel_submissions enable row level security; alter table public.reel_reactions enable row level security; alter table public.reel_comments enable row level security;
create policy "Public creator profiles" on public.creator_profiles for select using (discoverable or user_id=auth.uid() or public.is_admin());
create policy "Creators manage their profile" on public.creator_profiles for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "Public approved reels" on public.reel_submissions for select using (status='approved' or creator_id=auth.uid() or public.is_admin());
create policy "Creators submit own reels" on public.reel_submissions for insert to authenticated with check (creator_id=auth.uid() and status='pending');
create policy "Creators read own reels" on public.reel_submissions for select to authenticated using (creator_id=auth.uid());
create policy "Admins moderate reels" on public.reel_submissions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Public reactions readable" on public.reel_reactions for select using (true);
create policy "Users react once" on public.reel_reactions for insert to authenticated with check (user_id=auth.uid());
create policy "Users remove own reactions" on public.reel_reactions for delete to authenticated using (user_id=auth.uid());
create policy "Public visible comments" on public.reel_comments for select using (hidden=false or user_id=auth.uid() or public.is_admin());
create policy "Users add comments" on public.reel_comments for insert to authenticated with check (user_id=auth.uid());
create policy "Admins moderate comments" on public.reel_comments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Creators upload reel video" on storage.objects for insert to authenticated with check (bucket_id='creator-reels' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "View approved reel media" on storage.objects for select using (bucket_id='creator-reels' and exists (select 1 from public.reel_submissions where video_url=name and status='approved'));
create policy "Creators view own reel media" on storage.objects for select to authenticated using (bucket_id='creator-reels' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Admins view reel media" on storage.objects for select to authenticated using (bucket_id='creator-reels' and public.is_admin());
create policy "Creators delete own reel media" on storage.objects for delete to authenticated using (bucket_id='creator-reels' and (storage.foldername(name))[1]=auth.uid()::text);
alter table public.reel_submissions replica identity full; alter publication supabase_realtime add table public.reel_submissions, public.reel_reactions, public.reel_comments;
