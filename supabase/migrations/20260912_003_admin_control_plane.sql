-- Admin control plane: safe, auditable controls for live product operations.
alter table public.content add column if not exists workflow_status text not null default 'draft'
  check (workflow_status in ('draft','in_review','approved','published'));
alter table public.content add column if not exists review_notes text not null default '';

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z0-9_]{2,80}$'),
  name text not null, description text not null default '', enabled boolean not null default false,
  audience text not null default 'all' check (audience in ('all','admins','testers')),
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(), title text not null, message text not null,
  action_url text, audience text not null default 'all' check (audience in ('all','admins','testers')),
  published boolean not null default false, expires_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  subject text not null, message text not null, status text not null default 'open' check (status in ('open','in_progress','resolved')),
  admin_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.admin_audit_log enable row level security;
create policy "Public flags readable" on public.feature_flags for select using (true);
create policy "Public published notifications readable" on public.admin_notifications for select using (published and (expires_at is null or expires_at > now()));
create policy "Users create support tickets" on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
create policy "Users read own tickets" on public.support_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Admins manage flags" on public.feature_flags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage notifications" on public.admin_notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage support" on public.support_tickets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read audit log" on public.admin_audit_log for select to authenticated using (public.is_admin());

alter table public.feature_flags replica identity full;
alter table public.admin_notifications replica identity full;
alter publication supabase_realtime add table public.feature_flags, public.admin_notifications;
