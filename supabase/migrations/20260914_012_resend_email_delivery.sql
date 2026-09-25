-- Delivery state for transactional messages sent by the Resend Edge Function.
alter table public.email_outbox
  add column if not exists sent_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists provider_message_id text,
  add column if not exists last_error text,
  add column if not exists attempt_count integer not null default 0;

create index if not exists email_outbox_pending_created_at_idx
  on public.email_outbox (created_at)
  where status = 'pending';
