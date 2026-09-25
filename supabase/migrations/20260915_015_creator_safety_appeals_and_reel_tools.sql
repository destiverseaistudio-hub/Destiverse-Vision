-- Reporting, blocking, appeals, and creator-owned pending Reel management.
create table if not exists public.reel_reports (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reel_submissions(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 400),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), unique (reel_id, reporter_id)
);
create table if not exists public.creator_profile_reports (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 400),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (creator_id <> reporter_id), unique (creator_id, reporter_id)
);
create table if not exists public.creator_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(), primary key (blocker_id, creator_id),
  check (blocker_id <> creator_id)
);
create table if not exists public.reel_not_interested (
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.reel_submissions(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, reel_id)
);
create table if not exists public.creator_appeals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid references public.reel_submissions(id) on delete set null,
  appeal_type text not null check (appeal_type in ('reel_rejection', 'account_suspension')),
  message text not null check (char_length(trim(message)) between 20 and 1000),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  admin_note text not null default '', reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reel_reports_open_idx on public.reel_reports (created_at desc) where status = 'open';
create index if not exists creator_profile_reports_open_idx on public.creator_profile_reports (created_at desc) where status = 'open';
create index if not exists creator_appeals_open_idx on public.creator_appeals (created_at desc) where status = 'open';

alter table public.reel_reports enable row level security;
alter table public.creator_profile_reports enable row level security;
alter table public.creator_blocks enable row level security;
alter table public.reel_not_interested enable row level security;
alter table public.creator_appeals enable row level security;

create policy "Users report approved reels" on public.reel_reports for insert to authenticated with check (
  reporter_id = auth.uid() and exists (select 1 from public.reel_submissions where id = reel_id and status = 'approved')
);
create policy "Users read own reel reports" on public.reel_reports for select to authenticated using (reporter_id = auth.uid());
create policy "Admins manage reel reports" on public.reel_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users report creator profiles" on public.creator_profile_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Users read own creator reports" on public.creator_profile_reports for select to authenticated using (reporter_id = auth.uid());
create policy "Admins manage creator reports" on public.creator_profile_reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Users manage own creator blocks" on public.creator_blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "Users manage own not interested list" on public.reel_not_interested for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Creators submit own appeals" on public.creator_appeals for insert to authenticated with check (creator_id = auth.uid());
create policy "Creators read own appeals" on public.creator_appeals for select to authenticated using (creator_id = auth.uid());
create policy "Admins manage creator appeals" on public.creator_appeals for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Creators update own pending reels" on public.reel_submissions;
drop policy if exists "Creators delete own pending reels" on public.reel_submissions;
create policy "Creators update own pending reels" on public.reel_submissions for update to authenticated using (creator_id = auth.uid() and status = 'pending') with check (creator_id = auth.uid() and status = 'pending');
create policy "Creators delete own pending reels" on public.reel_submissions for delete to authenticated using (creator_id = auth.uid() and status = 'pending');

create or replace function public.log_creator_safety_admin_action()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() and old.status is distinct from new.status then
    insert into public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'safety_case_reviewed', tg_table_name, new.id::text, jsonb_build_object('from_status', old.status, 'to_status', new.status));
  end if;
  return new;
end; $$;
drop trigger if exists log_reel_report_admin_action on public.reel_reports;
create trigger log_reel_report_admin_action after update on public.reel_reports for each row execute function public.log_creator_safety_admin_action();
drop trigger if exists log_creator_report_admin_action on public.creator_profile_reports;
create trigger log_creator_report_admin_action after update on public.creator_profile_reports for each row execute function public.log_creator_safety_admin_action();
drop trigger if exists log_creator_appeal_admin_action on public.creator_appeals;
create trigger log_creator_appeal_admin_action after update on public.creator_appeals for each row execute function public.log_creator_safety_admin_action();

alter table public.reel_reports replica identity full;
alter table public.creator_profile_reports replica identity full;
alter table public.creator_appeals replica identity full;
do $$ begin alter publication supabase_realtime add table public.reel_reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.creator_profile_reports; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.creator_appeals; exception when duplicate_object then null; end $$;
