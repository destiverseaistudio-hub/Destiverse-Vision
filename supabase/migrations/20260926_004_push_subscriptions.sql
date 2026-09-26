create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null, user_agent text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_active_idx on public.push_subscriptions (active, updated_at desc);
alter table public.push_subscriptions enable row level security;
create policy "Users manage own push subscriptions" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admins read push subscriptions" on public.push_subscriptions for select to authenticated using (public.is_admin());
drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions for each row execute function public.set_app_settings_updated_at();
