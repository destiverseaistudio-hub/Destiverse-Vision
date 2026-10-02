-- Release notices are live app settings. The sent-version marker prevents an
-- ordinary settings edit from repeatedly notifying every opted-in device.
insert into public.app_settings (key, value)
values ('update_notification_sent_version', '')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
