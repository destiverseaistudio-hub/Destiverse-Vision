-- Keep tester/admin operational controls out of anonymous viewer responses.
-- Testers currently have no separate role model, so tester-targeted records are
-- deliberately admin-only until a tester membership model is introduced.
drop policy if exists "Public flags readable" on public.feature_flags;
create policy "Audience-safe flags readable"
on public.feature_flags for select
using (audience = 'all' or public.is_admin());

drop policy if exists "Public published notifications readable" on public.admin_notifications;
create policy "Audience-safe published notifications readable"
on public.admin_notifications for select
using (
  public.is_admin()
  or (
    published = true
    and audience = 'all'
    and (expires_at is null or expires_at > now())
  )
);
