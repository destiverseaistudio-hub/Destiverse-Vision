-- Keeps the first Reels page fast as the approved catalogue grows.
create index if not exists reel_submissions_approved_published_at_idx
  on public.reel_submissions (published_at desc nulls last, id desc)
  where status = 'approved';
