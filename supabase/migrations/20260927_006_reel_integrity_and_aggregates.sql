-- Keep public Reel comments trustworthy, structurally valid, and inexpensive to read.
create or replace function public.prepare_reel_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_reel_id uuid;
  profile_name text;
begin
  if new.user_id is distinct from auth.uid() then
    raise exception 'A comment author must be the signed-in user';
  end if;

  if new.parent_comment_id is not null then
    select reel_id into parent_reel_id from public.reel_comments where id = new.parent_comment_id;
    if parent_reel_id is null or parent_reel_id is distinct from new.reel_id then
      raise exception 'Replies must belong to a comment on the same Reel';
    end if;
  end if;

  select nullif(trim(display_name), '') into profile_name from public.profiles where id = auth.uid();
  new.author_name := coalesce(profile_name, nullif(auth.jwt() -> 'user_metadata' ->> 'display_name', ''), nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''), split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1), 'User');
  return new;
end;
$$;

drop trigger if exists prepare_reel_comment on public.reel_comments;
create trigger prepare_reel_comment
  before insert on public.reel_comments
  for each row execute function public.prepare_reel_comment();

-- Existing rows keep their original text but receive the best available profile label.
update public.reel_comments comment
set author_name = coalesce(nullif(trim(profile.display_name), ''), nullif(comment.author_name, ''), 'User')
from public.profiles profile
where profile.id = comment.user_id and comment.author_name = 'User';

drop policy if exists "Users delete own Reel comments" on public.reel_comments;
create policy "Users delete own Reel comments" on public.reel_comments
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "Creators moderate comments on own Reels" on public.reel_comments;
create policy "Creators moderate comments on own Reels" on public.reel_comments
  for update to authenticated using (
    exists (select 1 from public.reel_submissions where id = reel_id and creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.reel_submissions where id = reel_id and creator_id = auth.uid())
  );

create or replace function public.get_public_reel_feed_engagement(reel_ids uuid[])
returns table (reel_id uuid, likes bigint, comments bigint)
language sql
security definer
set search_path = public
as $$
  select reel.id,
    (select count(*) from public.reel_reactions reaction where reaction.reel_id = reel.id and reaction.reaction = 'love')::bigint,
    (select count(*) from public.reel_comments comment where comment.reel_id = reel.id and not comment.hidden)::bigint
  from public.reel_submissions reel
  join public.creator_profiles creator on creator.user_id = reel.creator_id and creator.discoverable = true
  where reel.status = 'approved' and reel.id = any(reel_ids);
$$;

create or replace function public.get_public_reel_comment_engagement(comment_ids uuid[])
returns table (comment_id uuid, likes bigint)
language sql
security definer
set search_path = public
as $$
  select comment.id, (select count(*) from public.reel_comment_reactions reaction where reaction.comment_id = comment.id)::bigint
  from public.reel_comments comment
  join public.reel_submissions reel on reel.id = comment.reel_id and reel.status = 'approved'
  where not comment.hidden and comment.id = any(comment_ids);
$$;

grant execute on function public.get_public_reel_feed_engagement(uuid[]) to anon, authenticated;
grant execute on function public.get_public_reel_comment_engagement(uuid[]) to anon, authenticated;
