# DestiVerse Vision deployment guide

## Required runtime environment variables

Create a production environment file for the web app and admin app using the values from your Supabase project.

### Web app

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_APP_URL`
- `VITE_PUBLIC_APP_URL`

### Admin app

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_APP_URL`
- `VITE_PUBLIC_APP_URL`

## Recommended deployment flow

1. Push to the main branch.
2. GitHub Actions runs `npm run build:all`.
3. Deploy the web app to a static hosting provider.
4. Deploy the admin app to a separate static hosting provider or subdomain.
5. Set production environment variables inside the host UI.
6. Test sign-in, sign-up, reset flow, and admin access using live credentials.

## Static hosting defaults

The project is prepared for static hosting with SPA rewrites:

- [apps/web/vercel.json](../apps/web/vercel.json)
- [apps/admin/vercel.json](../apps/admin/vercel.json)

## Build verification

Run locally before deployment:

```bash
npm ci
npm run build:all
```

## Production hardening checklist

- Use live Supabase production keys only.
- Restrict production admin role assignments.
- Turn on email verification and CAPTCHA.
- Review browser security and cookie settings.
- Configure uptime and error monitoring.
- Confirm both apps are deployed to their final domains and redirect URLs.
