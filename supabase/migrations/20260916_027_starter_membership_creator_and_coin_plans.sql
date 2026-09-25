-- Editable starter pricing in Nigerian Naira. These are optional upgrades;
-- no free viewing, free Reels, or existing creator access is removed.
insert into public.dv_subscription_plans (name, price_cents, currency, duration_days, features, coins_included, active)
select 'Vision Plus', 150000, 'NGN', 30, '["Ad-free viewing", "Offline Watch", "Priority support"]'::jsonb, 100, true
where not exists (select 1 from public.dv_subscription_plans where name = 'Vision Plus');
insert into public.dv_subscription_plans (name, price_cents, currency, duration_days, features, coins_included, active)
select 'Vision Max', 350000, 'NGN', 30, '["Everything in Vision Plus", "Early feature access", "300 monthly Coins"]'::jsonb, 300, true
where not exists (select 1 from public.dv_subscription_plans where name = 'Vision Max');
insert into public.dv_creator_plans (name, price_cents, currency, duration_days, features, active)
select 'Creator Pro', 250000, 'NGN', 30, '["Film Studio submissions", "Film, series, trailer, documentary and Nollywood formats", "Admin catalog review"]'::jsonb, true
where not exists (select 1 from public.dv_creator_plans where name = 'Creator Pro');
insert into public.dv_creator_plans (name, price_cents, currency, duration_days, features, active)
select 'Creator Studio Plus', 500000, 'NGN', 30, '["Everything in Creator Pro", "Priority creator support", "Early access to new creator tools"]'::jsonb, true
where not exists (select 1 from public.dv_creator_plans where name = 'Creator Studio Plus');
insert into public.dv_coin_products (name, coins, price_cents, currency, active)
select 'Mini Coin Pack', 100, 50000, 'NGN', true
where not exists (select 1 from public.dv_coin_products where name = 'Mini Coin Pack');
insert into public.dv_coin_products (name, coins, price_cents, currency, active)
select 'Value Coin Pack', 500, 200000, 'NGN', true
where not exists (select 1 from public.dv_coin_products where name = 'Value Coin Pack');
insert into public.dv_coin_products (name, coins, price_cents, currency, active)
select 'Power Coin Pack', 1200, 400000, 'NGN', true
where not exists (select 1 from public.dv_coin_products where name = 'Power Coin Pack');
