-- Creator-only profile library, private Reel visibility, sound saves, and a
-- server-enforced weekly AI drafting allowance.
alter table public.reel_submissions
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

update public.reel_submissions set visibility = 'public' where visibility is null;

drop policy if exists "Public discoverable approved reels" on public.reel_submissions;
create policy "Public discoverable approved reels" on public.reel_submissions for select using (
  status = 'approved' and visibility = 'public' and exists (
    select 1 from public.creator_profiles where user_id = creator_id and discoverable = true
  )
);

create or replace function public.set_my_reel_visibility(p_reel_id uuid, p_visibility text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_visibility not in ('public', 'private') then raise exception 'Invalid Reel visibility'; end if;
  update public.reel_submissions
  set visibility = p_visibility
  where id = p_reel_id and creator_id = auth.uid();
  if not found then raise exception 'Reel not found'; end if;
  return p_visibility;
end;
$$;
grant execute on function public.set_my_reel_visibility(uuid, text) to authenticated;

create table if not exists public.reel_sound_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  sound_key text not null check (char_length(trim(sound_key)) between 1 and 180),
  sound_label text not null check (char_length(trim(sound_label)) between 1 and 180),
  created_at timestamptz not null default now(),
  primary key (user_id, sound_key)
);
create index if not exists reel_sound_saves_user_created_idx on public.reel_sound_saves (user_id, created_at desc);
alter table public.reel_sound_saves enable row level security;
create policy "Users manage own Reel sound saves" on public.reel_sound_saves
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.creator_reel_ai_weekly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  request_count integer not null default 0 check (request_count between 0 and 5),
  primary key (user_id, week_start)
);
alter table public.creator_reel_ai_weekly_usage enable row level security;

create or replace function public.consume_creator_reel_ai_request()
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare current_week date := date_trunc('week', now() at time zone 'utc')::date;
declare next_count integer;
begin
  if not exists (select 1 from public.creator_applications where user_id = auth.uid() and status = 'approved') then
    raise exception 'An approved creator account is required';
  end if;
  insert into public.creator_reel_ai_weekly_usage (user_id, week_start, request_count)
  values (auth.uid(), current_week, 1)
  on conflict (user_id, week_start) do update
    set request_count = public.creator_reel_ai_weekly_usage.request_count + 1
    where public.creator_reel_ai_weekly_usage.request_count < 5
  returning request_count into next_count;
  if next_count is null then return query select false, 0; else return query select true, 5 - next_count; end if;
end;
$$;
grant execute on function public.consume_creator_reel_ai_request() to authenticated;
