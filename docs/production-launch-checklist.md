# DestiVerse Vision production checklist

Complete these outside the codebase before inviting the public.

- Enable Supabase CAPTCHA and email-confirmation for sign-up abuse protection.
- Set Supabase Auth redirect URLs to the final web domain only.
- Use a verified custom domain before turning on Resend email delivery.
- Enable daily database backups and test restoring a backup.
- Add error monitoring (for example Sentry) to the web app, Admin, and Edge Functions.
- Configure uptime checks for the web app, Admin, Supabase Edge Functions, and storage.
- Review the public Privacy Policy, Terms, Community Guidelines, and Creator Rules with legal counsel for your country.
- Restrict production admin roles to named staff and review the audit log regularly.
- Test mobile layouts, slow network uploads, empty states, account suspension, and report moderation with test accounts.
