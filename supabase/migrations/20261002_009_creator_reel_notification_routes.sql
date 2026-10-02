-- A Reel decision alert must open the creator's specific Reel rather than a
-- generic feed. This also repairs the trigger used by automated and manual
-- moderation decisions.
create or replace function public.notify_creator_reel_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare note_text text;
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected') then
    note_text := nullif(trim(coalesce(new.moderation_note, '')), '');
    insert into public.user_notifications (user_id, title, message, action_url)
    values (
      new.creator_id,
      case when new.status = 'approved' then 'Your Reel is live' else 'Your Reel needs changes' end,
      case
        when new.status = 'approved' then '“' || new.title || '” has been accepted and published.' || case when note_text is null then '' else ' Note from the review team: ' || note_text end
        else '“' || new.title || '” was not published.' || case when note_text is null then ' Review the submission guidance, then edit or upload a corrected Reel.' else ' Reason: ' || note_text end
      end,
      case when new.status = 'approved' then '/dashboard/reels/' || new.id::text else '/dashboard/creator-studio?reel=' || new.id::text end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_creator_reel_decision on public.reel_submissions;
create trigger notify_creator_reel_decision after update of status on public.reel_submissions
for each row execute function public.notify_creator_reel_decision();
