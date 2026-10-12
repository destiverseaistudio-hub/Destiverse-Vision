# Security
Status: Operational baseline — production configuration still requires the
evidence in `docs/production-launch-checklist.md`.

## Security baseline

- Browser clients use only the Supabase anonymous key; service-role and provider secrets belong only in Edge Function/project secrets.
- Tables and Storage must remain protected with RLS. Validate every policy with accounts that have no admin role.
- Payment fulfillment must be driven by verified Paystack webhooks and remain idempotent.
- Creator submissions, reports, appeals, moderation decisions, and admin actions require audit records and least-privilege access.
- Production deploys must run the CI unit-test, build, and lint checks.
- Log errors without passwords, access tokens, payment payload secrets, full account-deletion reasons, or private media URLs.

## Required recurring controls

- Review named admin access and audit logs monthly.
- Rotate integration secrets after staff changes or suspected exposure.
- Test database restore and account/data-deletion workflows at least quarterly.
- Triage critical security, payment, and moderation incidents with a documented owner and resolution record.
