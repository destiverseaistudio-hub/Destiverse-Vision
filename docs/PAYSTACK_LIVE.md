# Paystack live setup

The web app initializes Paystack checkout only through the `initialize-paystack-payment` Edge Function. The Paystack secret key is never sent to the browser.

## Required Supabase Edge Function secrets

Set these in **Supabase Dashboard > Edge Functions > Secrets**:

- `PAYSTACK_SECRET_KEY` — the live secret key beginning with `sk_live_`.
- `PUBLIC_APP_URL` — `https://destiverse-vision-app.vercel.app`

Do not put a Paystack secret key in Vercel variables, a frontend `VITE_*` variable, or a committed `.env` file.

## Deploy functions

Deploy these functions to project `tnpjxdbduqmhqtebdmhn`:

```powershell
npx supabase functions deploy initialize-paystack-payment --project-ref tnpjxdbduqmhqtebdmhn
npx supabase functions deploy verify-paystack-payment --project-ref tnpjxdbduqmhqtebdmhn
npx supabase functions deploy paystack-webhook --project-ref tnpjxdbduqmhqtebdmhn
```

The `supabase/config.toml` configuration deliberately disables Supabase JWT validation only for `paystack-webhook`. That endpoint validates Paystack's `x-paystack-signature` HMAC using `PAYSTACK_SECRET_KEY` before fulfilling an order.

## Paystack Dashboard

In the **live** Paystack dashboard, set the webhook URL to:

```
https://tnpjxdbduqmhqtebdmhn.supabase.co/functions/v1/paystack-webhook
```

Then perform one low-value real payment. Confirm that its `payment_orders` row becomes `paid` and that the matching Coins, membership, or Creator Pro entitlement is granted once.
