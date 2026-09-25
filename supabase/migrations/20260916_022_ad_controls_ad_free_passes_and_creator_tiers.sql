-- More flexible, viewer-respecting advertising. Premium remains ad-free; a
-- viewer may spend Coins on a short ad-free pass without losing free access.
alter table public.ad_campaigns drop constraint if exists ad_campaigns_format_check;
alter table public.ad_campaigns add constraint ad_campaigns_format_check check (format in ('banner', 'ribbon', 'popup', 'pre_roll', 'mid_roll', 'end_card', 'reel_ad'));
alter table public.ad_campaigns add column if not exists reel_interval integer not null default 10 check (reel_interval between 3 and 30);
alter table public.ad_campaigns add column if not exists ad_network text not null default 'direct' check (ad_network in ('direct', 'google'));
alter table public.ad_campaigns add column if not exists network_placement_id text;

create table if not exists public.user_ad_free_passes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.user_ad_free_passes enable row level security;
drop policy if exists "Users read own ad free pass" on public.user_ad_free_passes;
drop policy if exists "Admins read ad free passes" on public.user_ad_free_passes;
create policy "Users read own ad free pass" on public.user_ad_free_passes for select to authenticated using (user_id = auth.uid());
create policy "Admins read ad free passes" on public.user_ad_free_passes for select to authenticated using (public.is_admin());

-- Fixed, transparent price. This is the only place a pass can be purchased,
-- so a browser cannot choose its own price or create Coins.
create or replace function public.purchase_ad_free_day()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare wallet_balance integer; pass_expires timestamptz; price integer := 30;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select balance into wallet_balance from public.user_coin_wallets where user_id = auth.uid() for update;
  if coalesce(wallet_balance, 0) < price then raise exception 'You need % Coins for one ad-free day', price; end if;
  update public.user_coin_wallets set balance = balance - price, updated_at = now() where user_id = auth.uid();
  select expires_at into pass_expires from public.user_ad_free_passes where user_id = auth.uid() for update;
  pass_expires := greatest(coalesce(pass_expires, now()), now()) + interval '1 day';
  insert into public.user_ad_free_passes (user_id, expires_at, updated_at) values (auth.uid(), pass_expires, now())
  on conflict (user_id) do update set expires_at = excluded.expires_at, updated_at = now();
  insert into public.coin_ledger (user_id, amount, reason) values (auth.uid(), -price, 'One-day ad-free pass');
  insert into public.user_notifications (user_id, title, message, action_url) values (auth.uid(), 'Ad-free day active', 'Your Coin pass has removed DestiVerse ads for 24 hours.', '/dashboard/membership');
  return pass_expires;
end; $$;
revoke all on function public.purchase_ad_free_day() from public;
grant execute on function public.purchase_ad_free_day() to authenticated;

-- Private administration upload bucket. Only administrators can upload or
-- replace campaign media; the app reads public URLs generated after upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-media', 'ad-media', true, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Admins upload ad media" on storage.objects;
drop policy if exists "Admins update ad media" on storage.objects;
drop policy if exists "Admins delete ad media" on storage.objects;
create policy "Admins upload ad media" on storage.objects for insert to authenticated with check (bucket_id = 'ad-media' and public.is_admin());
create policy "Admins update ad media" on storage.objects for update to authenticated using (bucket_id = 'ad-media' and public.is_admin()) with check (bucket_id = 'ad-media' and public.is_admin());
create policy "Admins delete ad media" on storage.objects for delete to authenticated using (bucket_id = 'ad-media' and public.is_admin());
