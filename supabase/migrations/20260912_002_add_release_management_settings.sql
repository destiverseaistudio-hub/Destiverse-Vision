-- Live release communication settings, managed in the admin panel and read by
-- the public app through the existing app_settings Realtime subscription.
insert into public.app_settings (key, value)
values
  ('update_enabled', 'false'),
  ('update_version', ''),
  ('update_title', ''),
  ('update_message', ''),
  ('update_link', '')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
