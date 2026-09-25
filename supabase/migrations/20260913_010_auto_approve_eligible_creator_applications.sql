-- Starter creator access: complete applications receive upload access immediately.
-- Admins still govern the account and every Reel can be rejected or removed.
create or replace function public.activate_eligible_creator_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' and new.accepts_creator_rules
    and char_length(trim(new.legal_name)) >= 2
    and char_length(trim(new.country)) >= 2
    and char_length(trim(new.creator_statement)) >= 40 then
    update public.creator_applications
      set status = 'approved',
          review_note = 'Starter creator access activated after the application requirements were completed.',
          reviewed_at = now()
      where user_id = new.user_id and status = 'pending';
  end if;
  return null;
end;
$$;

drop trigger if exists activate_eligible_creator_application on public.creator_applications;
create trigger activate_eligible_creator_application
after insert or update on public.creator_applications
for each row
when (new.status = 'pending')
execute function public.activate_eligible_creator_application();
