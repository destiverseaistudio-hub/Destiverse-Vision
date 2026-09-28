-- Cloudflare Stream remains supported. Livepeer is the zero-cost Sandbox
-- fallback used while Cloudflare Stream billing is not enabled.
alter table public.creator_live_streams
  add column if not exists provider text not null default 'cloudflare'
    check (provider in ('cloudflare', 'livepeer'));

create index if not exists creator_live_streams_provider_status_idx
  on public.creator_live_streams (provider, status);
