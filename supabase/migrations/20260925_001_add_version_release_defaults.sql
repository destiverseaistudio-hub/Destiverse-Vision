-- Ensure the release/version settings exist for the public app and admin controls.
insert into public.app_settings (key, value)
values
  ('app_version', '1.0.0'),
  ('minimum_required_version', ''),
  ('update_enabled', 'false'),
  ('update_version', '1.0.0'),
  ('update_title', 'DestiVerse Vision update'),
  ('update_message', 'A fresh update is available.'),
  ('release_notes', ''),
  ('update_link', ''),
  ('maintenance_enabled', 'false'),
  ('maintenance_message', 'We are making improvements to DestiVerse Vision. Please check back shortly.')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
