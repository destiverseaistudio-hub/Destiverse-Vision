-- Creator applications are deliberately separate from public profiles so a creator
-- cannot approve their own application through an ordinary profile update.
create table if not exists public.creator_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 2 and 120),
  contact_email text not null check (position('@' in contact_email) > 1),
  country text not null check (char_length(trim(country)) between 2 and 80),
  creator_statement text not null check (char_length(trim(creator_statement)) between 40 and 1000),
  portfolio_url text, social_url text,
  accepts_creator_rules boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  review_note text not null default '', reviewed_at timestamptz, reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.reel_submissions
  add column if not exists auto_review_status text not null default 'not_started' check (auto_review_status in ('not_started', 'clear', 'needs_review', 'flagged', 'unavailable')),
  add column if not exists auto_review_reason text not null default '',
  add column if not exists auto_reviewed_at timestamptz;

-- Apply these defensively in case the preceding Reels migration was already run.
update storage.buckets set public = false where id = 'creator-reels';
drop policy if exists "Public view approved reel media" on storage.objects;
drop policy if exists "View approved reel media" on storage.objects;
drop policy if exists "Creators view own reel media" on storage.objects;
drop policy if exists "Admins view reel media" on storage.objects;
create policy "View approved reel media" on storage.objects for select using (bucket_id = 'creator-reels' and exists (select 1 from public.reel_submissions where video_url = name and status = 'approved'));
create policy "Creators view own reel media" on storage.objects for select to authenticated using (bucket_id = 'creator-reels' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admins view reel media" on storage.objects for select to authenticated using (bucket_id = 'creator-reels' and public.is_admin());

alter table public.creator_applications enable row level security;
create policy "Applicants read own application" on public.creator_applications for select to authenticated using (user_id = auth.uid());
create policy "Applicants submit pending application" on public.creator_applications for insert to authenticated with check (user_id = auth.uid() and status = 'pending' and accepts_creator_rules = true);
create policy "Applicants update pending application" on public.creator_applications for update to authenticated using (user_id = auth.uid() and status in ('pending', 'declined')) with check (user_id = auth.uid() and status = 'pending' and accepts_creator_rules = true);
create policy "Admins manage creator applications" on public.creator_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Creators submit own reels" on public.reel_submissions;
create policy "Approved creators submit own reels" on public.reel_submissions for insert to authenticated with check (
  creator_id = auth.uid() and status = 'pending' and exists (
    select 1 from public.creator_applications where user_id = auth.uid() and status = 'approved'
  )
);
drop policy if exists "Creators upload reel video" on storage.objects;
create policy "Approved creators upload reel video" on storage.objects for insert to authenticated with check (
  bucket_id = 'creator-reels' and (storage.foldername(name))[1] = auth.uid()::text and exists (
    select 1 from public.creator_applications where user_id = auth.uid() and status = 'approved'
  )
);

alter table public.reel_submissions replica identity full;
