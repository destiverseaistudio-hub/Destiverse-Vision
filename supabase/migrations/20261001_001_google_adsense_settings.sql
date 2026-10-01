-- Public publisher IDs and slot IDs are required by AdSense in the browser.
-- They are disabled by default and only render for viewers without ad-free access.
insert into public.app_settings (key, value)
values
  ('google_adsense_enabled', 'false'),
  ('google_adsense_client', ''),
  ('google_adsense_home_slot', ''),
  ('google_adsense_content_slot', '')
on conflict (key) do nothing;
