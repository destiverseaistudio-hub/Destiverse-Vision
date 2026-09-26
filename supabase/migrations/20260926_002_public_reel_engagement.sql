-- Public, read-only totals for approved, discoverable Reels. View events remain private;
-- this function exposes only aggregate numbers needed by the Reel feed and public profiles.
alter table public.reel_submissions add column if not exists audio_label text;

create or replace function public.get_public_reel_engagement(reel_ids uuid[])
returns table (reel_id uuid, likes bigint, views bigint)
language sql
security definer
set search_path = public
as $$
  select
    reel.id as reel_id,
    coalesce(reactions.likes, 0)::bigint as likes,
    coalesce(view_events.views, 0)::bigint as views
  from public.reel_submissions reel
  join public.creator_profiles creator on creator.user_id = reel.creator_id and creator.discoverable = true
  left join lateral (
    select count(*) as likes
    from public.reel_reactions reaction
    where reaction.reel_id = reel.id and reaction.reaction = 'love'
  ) reactions on true
  left join lateral (
    select count(*) as views
    from public.reel_view_events view_event
    where view_event.reel_id = reel.id
  ) view_events on true
  where reel.status = 'approved'
    and reel.id = any(reel_ids)
  ;
$$;

grant execute on function public.get_public_reel_engagement(uuid[]) to anon, authenticated;
