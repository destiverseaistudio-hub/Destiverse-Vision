-- Foundations for creator discovery, premieres, achievements, subscriptions,
-- and future media-processing workflows. Payment, DRM, and transcoding remain
-- provider integrations and are intentionally not simulated here.
create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(), name text not null, handle text unique not null,
  bio text not null default '', avatar_url text, verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.content add column if not exists creator_id uuid references public.creators(id) on delete set null;
create table if not exists public.creator_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references public.creators(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, creator_id)
);
create table if not exists public.premieres (
  id uuid primary key default gen_random_uuid(), content_id text not null references public.content(id) on delete cascade,
  starts_at timestamptz not null, title text not null default '', live boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.premiere_reactions (
  premiere_id uuid not null references public.premieres(id) on delete cascade, user_id uuid references auth.users(id) on delete set null,
  reaction text not null check (reaction in ('love','fire','wow')), created_at timestamptz not null default now()
);
create table if not exists public.achievements (
  key text primary key, title text not null, description text not null, icon text not null default 'sparkle'
);
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade, achievement_key text not null references public.achievements(key) on delete cascade,
  earned_at timestamptz not null default now(), primary key (user_id, achievement_key)
);
create table if not exists public.dv_subscription_plans (
  id uuid primary key default gen_random_uuid(), name text not null, active boolean not null default false, price_cents integer, currency text, created_at timestamptz not null default now()
);
create table if not exists public.dv_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade, plan_id uuid references public.dv_subscription_plans(id), status text not null default 'inactive' check (status in ('inactive','active','past_due','cancelled')), expires_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.media_jobs (
  id uuid primary key default gen_random_uuid(), content_id text not null references public.content(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')), provider text, output_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.creators enable row level security;
alter table public.creator_follows enable row level security;
alter table public.premieres enable row level security;
alter table public.premiere_reactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.dv_subscription_plans enable row level security;
alter table public.dv_subscriptions enable row level security;
alter table public.media_jobs enable row level security;
drop policy if exists "Public creators readable" on public.creators;
drop policy if exists "Users manage own follows" on public.creator_follows;
drop policy if exists "Public premieres readable" on public.premieres;
drop policy if exists "Users add premiere reactions" on public.premiere_reactions;
drop policy if exists "Public achievements readable" on public.achievements;
drop policy if exists "Users read own achievements" on public.user_achievements;
drop policy if exists "Public active plans readable" on public.dv_subscription_plans;
drop policy if exists "Users read own subscription" on public.dv_subscriptions;
drop policy if exists "Admins manage experience data" on public.creators;
drop policy if exists "Admins manage premieres" on public.premieres;
drop policy if exists "Admins manage achievements" on public.achievements;
drop policy if exists "Admins manage user achievements" on public.user_achievements;
drop policy if exists "Admins manage plans" on public.dv_subscription_plans;
drop policy if exists "Admins manage subscriptions" on public.dv_subscriptions;
drop policy if exists "Admins manage media jobs" on public.media_jobs;
create policy "Public creators readable" on public.creators for select using (true);
create policy "Users manage own follows" on public.creator_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Public premieres readable" on public.premieres for select using (true);
create policy "Users add premiere reactions" on public.premiere_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "Public achievements readable" on public.achievements for select using (true);
create policy "Users read own achievements" on public.user_achievements for select to authenticated using (user_id = auth.uid());
create policy "Public active plans readable" on public.dv_subscription_plans for select using (active = true or public.is_admin());
create policy "Users read own subscription" on public.dv_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "Admins manage experience data" on public.creators for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage premieres" on public.premieres for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage achievements" on public.achievements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage user achievements" on public.user_achievements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage plans" on public.dv_subscription_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage subscriptions" on public.dv_subscriptions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage media jobs" on public.media_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
