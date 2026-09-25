-- Creator Pro is separate from viewer Premium. Reels remain free for every
-- approved creator; Creator Pro unlocks long-form catalog submissions.
create table if not exists public.dv_creator_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'NGN' check (char_length(currency) = 3),
  duration_days integer not null default 30 check (duration_days between 1 and 366),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_plan_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id uuid not null references public.dv_creator_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_content_submissions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  submission_type text not null check (submission_type in ('film', 'series', 'trailer', 'documentary', 'music_video', 'podcast', 'action_film', 'nollywood')),
  title text not null check (char_length(trim(title)) between 2 and 140),
  synopsis text not null check (char_length(trim(synopsis)) between 20 and 3000),
  category text not null default 'Creator Stories' check (char_length(trim(category)) between 2 and 80),
  tags text[] not null default '{}'::text[],
  language text not null default 'English' check (char_length(trim(language)) between 2 and 50),
  age_rating text not null default 'Not rated' check (char_length(trim(age_rating)) between 2 and 40),
  runtime_minutes integer check (runtime_minutes between 1 and 720),
  release_year integer check (release_year between 1900 and 2100),
  poster_url text,
  external_video_url text,
  storage_path text,
  subtitles_url text,
  rights_confirmed boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'removed')),
  moderation_note text not null default '',
  catalog_content_id text references public.content(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((external_video_url is not null and storage_path is null) or (external_video_url is null and storage_path is not null)),
  check (external_video_url is null or external_video_url ~* '^https?://')
);

create index if not exists creator_content_submissions_creator_created_idx on public.creator_content_submissions (creator_id, created_at desc);
create index if not exists creator_content_submissions_pending_idx on public.creator_content_submissions (created_at asc) where status = 'pending';

alter table public.dv_creator_plans enable row level security;
alter table public.creator_plan_subscriptions enable row level security;
alter table public.creator_content_submissions enable row level security;

drop policy if exists "Active creator plans are readable" on public.dv_creator_plans;
drop policy if exists "Admins manage creator plans" on public.dv_creator_plans;
drop policy if exists "Creators read own plan access" on public.creator_plan_subscriptions;
drop policy if exists "Admins manage creator plan access" on public.creator_plan_subscriptions;
drop policy if exists "Creators read own catalog submissions" on public.creator_content_submissions;
drop policy if exists "Creator Pro submits catalog content" on public.creator_content_submissions;
drop policy if exists "Creator Pro edits pending catalog content" on public.creator_content_submissions;
drop policy if exists "Admins manage creator catalog submissions" on public.creator_content_submissions;

create policy "Active creator plans are readable" on public.dv_creator_plans for select to authenticated using (active or public.is_admin());
create policy "Admins manage creator plans" on public.dv_creator_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Creators read own plan access" on public.creator_plan_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Admins manage creator plan access" on public.creator_plan_subscriptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Creators read own catalog submissions" on public.creator_content_submissions for select to authenticated using (creator_id = auth.uid() or public.is_admin());
create policy "Creator Pro submits catalog content" on public.creator_content_submissions for insert to authenticated with check (
  creator_id = auth.uid() and status = 'pending' and rights_confirmed = true
  and exists (select 1 from public.creator_applications where user_id = auth.uid() and status = 'approved')
  and exists (select 1 from public.creator_plan_subscriptions where user_id = auth.uid() and status = 'active' and expires_at > now())
);
create policy "Creator Pro edits pending catalog content" on public.creator_content_submissions for update to authenticated using (creator_id = auth.uid() and status in ('pending', 'changes_requested')) with check (creator_id = auth.uid() and status = 'pending' and rights_confirmed = true);
create policy "Admins manage creator catalog submissions" on public.creator_content_submissions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Private during review. Approved items can be signed by a logged-in viewer;
-- their raw storage path is never exposed as a public object URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('creator-film-media', 'creator-film-media', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Creator Pro uploads catalog video" on storage.objects;
drop policy if exists "Creators read own catalog video" on storage.objects;
drop policy if exists "Admins read catalog video" on storage.objects;
drop policy if exists "View approved catalog video" on storage.objects;
drop policy if exists "Creators delete own catalog video" on storage.objects;
create policy "Creator Pro uploads catalog video" on storage.objects for insert to authenticated with check (
  bucket_id = 'creator-film-media' and (storage.foldername(name))[1] = auth.uid()::text
  and exists (select 1 from public.creator_plan_subscriptions where user_id = auth.uid() and status = 'active' and expires_at > now())
);
create policy "Creators read own catalog video" on storage.objects for select to authenticated using (bucket_id = 'creator-film-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admins read catalog video" on storage.objects for select to authenticated using (bucket_id = 'creator-film-media' and public.is_admin());
create policy "View approved catalog video" on storage.objects for select to authenticated using (bucket_id = 'creator-film-media' and exists (select 1 from public.creator_content_submissions where storage_path = name and status = 'approved'));
create policy "Creators delete own catalog video" on storage.objects for delete to authenticated using (bucket_id = 'creator-film-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Payment orders retain their existing purpose for viewer Premium and Coins;
-- this third purpose is used only for the separate Creator Pro entitlement.
alter table public.payment_orders add column if not exists creator_plan_id uuid references public.dv_creator_plans(id) on delete set null;
alter table public.payment_orders drop constraint if exists payment_orders_purpose_check;
alter table public.payment_orders drop constraint if exists payment_orders_check;
alter table public.payment_orders drop constraint if exists payment_orders_product_check;
alter table public.payment_orders add constraint payment_orders_purpose_check check (purpose in ('membership', 'coins', 'creator_plan'));
alter table public.payment_orders add constraint payment_orders_product_check check (
  (purpose = 'membership' and plan_id is not null and coin_product_id is null and creator_plan_id is null)
  or (purpose = 'coins' and coin_product_id is not null and plan_id is null and creator_plan_id is null)
  or (purpose = 'creator_plan' and creator_plan_id is not null and plan_id is null and coin_product_id is null)
);

create or replace function public.sync_creator_catalog_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare catalog_id text;
declare catalog_type text;
declare source_url text;
begin
  if new.status = 'approved' then
    catalog_id := coalesce(new.catalog_content_id, 'creator-' || replace(new.id::text, '-', ''));
    catalog_type := case new.submission_type when 'series' then 'Series' when 'documentary' then 'Documentary' when 'trailer' then 'Short Film' else 'Movie' end;
    source_url := coalesce(new.external_video_url, 'creator-film-media:' || new.storage_path);
    insert into public.content (id, title, description, type, category, meta, badge, artwork_class, video_src, published, home_section, section_order, display_order, poster_url, hero_url)
    values (catalog_id, new.title, new.synopsis, catalog_type, new.category, concat(coalesce(new.runtime_minutes::text || ' min', ''), case when new.release_year is not null then case when new.runtime_minutes is not null then ' · ' else '' end || new.release_year::text else '' end, case when new.language <> '' then ' · ' || new.language else '' end), 'Creator approved', 'dv-art-river', source_url, true, 'Creator Stories', 50, 0, new.poster_url, new.poster_url)
    on conflict (id) do update set title = excluded.title, description = excluded.description, type = excluded.type, category = excluded.category, meta = excluded.meta, badge = excluded.badge, video_src = excluded.video_src, published = true, poster_url = excluded.poster_url, hero_url = excluded.hero_url, updated_at = now();
    if new.catalog_content_id is null then update public.creator_content_submissions set catalog_content_id = catalog_id, published_at = coalesce(published_at, now()), updated_at = now() where id = new.id; end if;
  elsif old.status = 'approved' and new.catalog_content_id is not null then
    update public.content set published = false, updated_at = now() where id = new.catalog_content_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_creator_catalog_submission on public.creator_content_submissions;
create trigger sync_creator_catalog_submission after update of status, title, synopsis, category, submission_type, runtime_minutes, release_year, language, poster_url, external_video_url, storage_path on public.creator_content_submissions for each row execute function public.sync_creator_catalog_submission();

alter table public.creator_content_submissions replica identity full;
do $$ begin alter publication supabase_realtime add table public.creator_content_submissions; exception when duplicate_object then null; end $$;
