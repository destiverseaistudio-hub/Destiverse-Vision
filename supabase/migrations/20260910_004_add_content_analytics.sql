create table if not exists public.content_events (
  id bigint generated always as identity primary key,
  content_id text references public.content(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'play_start')),
  user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists content_events_content_event_idx
  on public.content_events (content_id, event_type, occurred_at desc);

create index if not exists content_events_occurred_at_idx
  on public.content_events (occurred_at desc);

alter table public.content_events enable row level security;

create policy "Visitors can record content events"
on public.content_events for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

create policy "Admins can read content events"
on public.content_events for select
to authenticated
using (public.is_admin());

alter table public.content_events replica identity full;
alter publication supabase_realtime add table public.content_events;
