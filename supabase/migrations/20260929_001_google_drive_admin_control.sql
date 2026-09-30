-- Google Drive uses a user consent flow and is disabled by default until the
-- administrator has completed Google OAuth and Drive API configuration.
insert into public.app_settings (key, value)
values ('google_drive_enabled', 'false')
on conflict (key) do nothing;
