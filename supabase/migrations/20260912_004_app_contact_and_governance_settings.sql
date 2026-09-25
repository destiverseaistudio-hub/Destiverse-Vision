-- Admin-managed public contact, CTA, homepage, legal, and maintenance settings.
insert into public.app_settings (key, value) values
  ('support_email', ''),
  ('support_phone', ''),
  ('support_whatsapp_url', ''),
  ('contact_cta_label', 'Contact support'),
  ('contact_cta_url', ''),
  ('site_url', ''),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('maintenance_enabled', 'false'),
  ('maintenance_message', ''),
  ('about_page', ''),
  ('privacy_policy', ''),
  ('terms_of_service', ''),
  ('help_center', '')
on conflict (key) do nothing;

alter table public.support_tickets add column if not exists contact_email text;
alter table public.support_tickets add column if not exists admin_reply text not null default '';
alter table public.support_tickets add column if not exists replied_at timestamptz;

notify pgrst, 'reload schema';
