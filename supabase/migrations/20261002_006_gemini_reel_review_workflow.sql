-- Gemini review data is retained with the Reel so creators and moderators can
-- understand a decision, appeal it, and submit an improved version.
alter table public.reel_submissions
  add column if not exists ai_decision text,
  add column if not exists ai_confidence numeric,
  add column if not exists ai_creator_note text not null default '',
  add column if not exists ai_media_file_name text,
  add column if not exists ai_reviewed_at timestamptz,
  add column if not exists review_round integer not null default 1,
  add column if not exists resubmitted_at timestamptz;

alter table public.reel_submissions
  drop constraint if exists reel_submissions_auto_review_status_check;
alter table public.reel_submissions
  add constraint reel_submissions_auto_review_status_check check (
    auto_review_status in ('not_started', 'processing', 'clear', 'needs_review', 'flagged', 'unavailable', 'failed')
  );

-- Notify the creator regardless of whether the decision was made by Gemini or
-- by an administrator. The note is saved on the Reel as well as in the inbox.
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
        when new.status = 'approved' then
          '“' || new.title || '” has been accepted and published.' ||
          case when note_text is null then '' else ' Note from the review team: ' || note_text end
        else
          '“' || new.title || '” was not published.' ||
          case when note_text is null then ' Review the submission guidance, then edit or upload a corrected Reel.' else ' Reason: ' || note_text end
      end,
      case when new.status = 'approved' then '/dashboard/reels' else '/dashboard/creator-studio' end
    );
  end if;
  return new;
end;
$$;
drop trigger if exists notify_creator_reel_decision on public.reel_submissions;
create trigger notify_creator_reel_decision
after update of status on public.reel_submissions
for each row execute function public.notify_creator_reel_decision();

-- A rejected creator can correct the title/caption and put the same Reel back
-- into the AI queue. Replacing the actual media uses the normal new-upload
-- flow, which keeps the previous decision and audit trail intact.
create or replace function public.resubmit_my_reel(p_reel_id uuid, p_title text, p_caption text)
returns public.reel_submissions
language plpgsql security definer set search_path = public as $$
declare updated_reel public.reel_submissions;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_title)) not between 1 and 120 then raise exception 'A title between 1 and 120 characters is required'; end if;
  if char_length(coalesce(p_caption, '')) > 500 then raise exception 'Caption must be 500 characters or fewer'; end if;
  update public.reel_submissions
  set title = trim(p_title), caption = trim(coalesce(p_caption, '')), status = 'pending',
      moderation_note = '', auto_review_status = 'not_started', auto_review_reason = '',
      auto_reviewed_at = null, ai_decision = null, ai_confidence = null,
      ai_creator_note = '', ai_media_file_name = null, ai_reviewed_at = null,
      review_round = review_round + 1, resubmitted_at = now(), published_at = null
  where id = p_reel_id and creator_id = auth.uid() and status = 'rejected'
  returning * into updated_reel;
  if not found then raise exception 'Only your rejected Reels can be resubmitted'; end if;
  return updated_reel;
end;
$$;
revoke all on function public.resubmit_my_reel(uuid, text, text) from public;
grant execute on function public.resubmit_my_reel(uuid, text, text) to authenticated;
