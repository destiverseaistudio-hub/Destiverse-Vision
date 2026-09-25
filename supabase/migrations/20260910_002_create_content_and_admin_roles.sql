create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.content (
  id text primary key,
  title text not null,
  description text not null default '',
  type text not null check (type in ('Movie', 'Series', 'Short Film', 'Documentary')),
  category text not null default 'DestiVerse Originals',
  meta text not null default '',
  badge text,
  artwork_class text not null default 'dv-art-river',
  featured boolean not null default false,
  video_src text,
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.content enable row level security;

create policy "Published content is publicly readable"
on public.content for select
using (published = true or public.is_admin());

create policy "Admins can insert content"
on public.content for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update content"
on public.content for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete content"
on public.content for delete
to authenticated
using (public.is_admin());

create or replace function public.set_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists content_updated_at on public.content;
create trigger content_updated_at
before update on public.content
for each row execute function public.set_content_updated_at();

alter table public.content replica identity full;
alter publication supabase_realtime add table public.content;

insert into public.content (id, title, description, type, category, meta, badge, artwork_class, featured, published)
values
  ('river-goddess-gift', 'The River Goddess''s Gift', 'A mysterious call awakens an ancient destiny, drawing a new generation into a story shaped by secrets, courage, and forces that refuse to remain forgotten.', 'Series', 'DestiVerse Reels', 'Original Storytelling', 'Featured', 'dv-art-river', true, true),
  ('river-goddess-part-1', 'The River Goddess''s Gift Part 1 - A Mysterious Call A Destiny Awakens!', 'A mysterious call awakens a destiny that will change everything.', 'Short Film', 'DestiVerse Reels', 'Part 1', 'Trending', 'dv-art-river', false, true),
  ('river-goddess-part-3', 'The River Goddess''s Gift Part 3 - The Covenant Secrets. Betrayal. A Destiny Revealed!', 'Secrets surface as an ancient covenant forces a destiny into the open.', 'Short Film', 'DestiVerse Reels', 'Part 3', 'Trending', 'dv-art-covenant', false, true),
  ('iron-pharaoh-part-3', 'The Iron Pharaoh Part 3 - The War of Egypt The Invasion Begins. The Hero Rises.', 'The invasion begins as a rising hero is forced into a war that will define an era.', 'Short Film', 'DestiVerse Reels', 'Part 3', 'Trending', 'dv-art-pharaoh', false, true)
on conflict (id) do nothing;

-- Bootstrap an administrator after creating the user in Supabase Auth:
-- insert into public.user_roles (user_id, role) values ('AUTH_USER_UUID', 'admin');
