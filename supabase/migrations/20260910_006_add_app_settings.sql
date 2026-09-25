create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Public settings are readable"
on public.app_settings for select
using (true);

create policy "Admins manage settings"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_app_settings_updated_at();

alter table public.app_settings replica identity full;
alter publication supabase_realtime add table public.app_settings;

insert into public.app_settings (key, value)
values
  ('hero_title', 'The River Goddess''s Gift'),
  ('hero_description', 'A mysterious call awakens an ancient destiny, drawing a new generation into a story shaped by secrets, courage, and forces that refuse to remain forgotten.'),
  ('announcement', '')
on conflict (key) do nothing;
