-- Comment safety, creator analytics, and tamper-resistant admin audit events.
create table if not exists public.reel_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.reel_comments(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 400),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create table if not exists public.reel_view_events (
  id bigint generated always as identity primary key,
  reel_id uuid not null references public.reel_submissions(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (reel_id, viewer_id, viewed_on)
);

create index if not exists reel_comment_reports_open_idx on public.reel_comment_reports (created_at desc) where status = 'open';
create index if not exists reel_view_events_reel_idx on public.reel_view_events (reel_id, created_at desc);

alter table public.reel_comment_reports enable row level security;
alter table public.reel_view_events enable row level security;

drop policy if exists "Users report comments" on public.reel_comment_reports;
drop policy if exists "Users read own comment reports" on public.reel_comment_reports;
drop policy if exists "Admins manage comment reports" on public.reel_comment_reports;
create policy "Users report comments" on public.reel_comment_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Users read own comment reports" on public.reel_comment_reports for select to authenticated using (reporter_id = auth.uid());
create policy "Admins manage comment reports" on public.reel_comment_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Viewers record daily Reel views" on public.reel_view_events;
drop policy if exists "Creators and admins read Reel views" on public.reel_view_events;
create policy "Viewers record daily Reel views" on public.reel_view_events for insert to authenticated with check (viewer_id = auth.uid());
create policy "Creators and admins read Reel views" on public.reel_view_events for select to authenticated using (
  public.is_admin() or exists (select 1 from public.reel_submissions where id = reel_id and creator_id = auth.uid())
);

-- Do not allow comments to be attached to a private/rejected Reel.
drop policy if exists "Users add comments" on public.reel_comments;
create policy "Users add comments" on public.reel_comments for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.reel_submissions where id = reel_id and status = 'approved')
);

-- A creator can pause public discovery without losing their private submissions.
drop policy if exists "Public approved reels" on public.reel_submissions;
create policy "Public discoverable approved reels" on public.reel_submissions for select using (
  status = 'approved' and exists (
    select 1 from public.creator_profiles where user_id = creator_id and discoverable = true
  )
);

create or replace function public.log_creator_reel_admin_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and (old.status is distinct from new.status or old.moderation_note is distinct from new.moderation_note) then
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'reel_moderated', 'reel_submission', new.id::text,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'moderation_note', new.moderation_note));
  end if;
  return new;
end; $$;

create or replace function public.log_creator_account_admin_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.status is distinct from new.status then
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'creator_access_changed', 'creator_application', new.user_id::text,
      jsonb_build_object('from_status', old.status, 'to_status', new.status, 'review_note', new.review_note));
  end if;
  return new;
end; $$;

create or replace function public.log_comment_moderation_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.hidden is distinct from new.hidden then
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), case when new.hidden then 'comment_hidden' else 'comment_restored' end, 'reel_comment', new.id::text,
      jsonb_build_object('reel_id', new.reel_id, 'body', left(new.body, 180)));
  end if;
  return new;
end; $$;

drop trigger if exists log_creator_reel_admin_action on public.reel_submissions;
create trigger log_creator_reel_admin_action after update on public.reel_submissions for each row execute function public.log_creator_reel_admin_action();
drop trigger if exists log_creator_account_admin_action on public.creator_applications;
create trigger log_creator_account_admin_action after update on public.creator_applications for each row execute function public.log_creator_account_admin_action();
drop trigger if exists log_comment_moderation_action on public.reel_comments;
create trigger log_comment_moderation_action after update on public.reel_comments for each row execute function public.log_comment_moderation_action();

alter table public.reel_comment_reports replica identity full;
alter table public.reel_view_events replica identity full;
do $$ begin alter publication supabase_realtime add table public.reel_comment_reports; exception when duplicate_object then null; end $$;
