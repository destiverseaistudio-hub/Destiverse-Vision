# DestiVerse Vision production checklist

Complete and record an owner, date, and evidence for every item before inviting
the public. These are production-account actions and cannot be performed from
the repository alone.

- Enable Supabase CAPTCHA and email-confirmation for sign-up abuse protection.
- Set Supabase Auth redirect URLs to the final web domain only.
- Use a verified custom domain before turning on Resend email delivery.
- Enable daily database backups and test restoring a backup.
- Add error monitoring (for example Sentry) to the web app, Admin, and Edge Functions.
- Configure uptime checks for the web app, Admin, Supabase Edge Functions, and storage.
- Review the public Privacy Policy, Terms, Community Guidelines, and Creator Rules with legal counsel for your country.
- Restrict production admin roles to named staff and review the audit log regularly.
- Test mobile layouts, slow network uploads, empty states, account suspension, and report moderation with test accounts.
- Apply every migration in `supabase/migrations` to production and deploy every Edge Function. Record the deployed project ref and migration version.
- Set and verify production secrets for Paystack, Resend, Gemini, Livepeer/Cloudflare, web push, and any other enabled integration. Rotate any secret exposed during setup.
- Run a Paystack test transaction and duplicate-webhook test; confirm one membership/Coin fulfillment and one audit-log entry only.
- Run creator moderation acceptance and rejection tests. Confirm approved notifications open `/dashboard/reels/:id` and rejected notifications focus the exact submission in Creator Studio.
- Verify RLS with separate viewer, creator, moderator, and administrator accounts. Attempt cross-account reads, writes, storage access, notification access, and payment mutations.
- Publish jurisdiction-reviewed Privacy Policy, Terms, Community Guidelines, Creator Rules, refund/cancellation terms, and a copyright/takedown contact before collecting payments or uploads.
- Create on-call ownership and incident runbooks for payment failures, harmful-content reports, account compromise, data deletion, service outage, and secret rotation.
