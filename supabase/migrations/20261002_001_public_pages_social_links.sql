-- Public pages and social destinations are stored in app_settings so changes
-- made by an administrator reach every connected viewer through Realtime.
insert into public.app_settings (key, value)
values
  ('youtube_url', ''),
  ('tiktok_url', ''),
  ('x_url', ''),
  ('whatsapp_channel_url', ''),
  ('about_page', $about$
Effective date: 2 October 2026

DestiVerse Vision is a digital entertainment and creative-media platform. We bring viewers together with films, series, short videos, creator stories, and other experiences selected or published for the DestiVerse community.

Our goal is to make discovery simple: find something worth watching, save it for later, follow new releases, and take part in a respectful creative community. We work with administrators, creators, and service partners to operate the platform, improve the viewing experience, and keep the community safe.

Content availability can change because of licensing, creator decisions, moderation, technical needs, or regional restrictions. Some content, offers, and features may be limited by account type, location, or device.

For support, privacy questions, or feedback, use the Help & contact page in the app.
$about$),
  ('privacy_policy', $privacy$
Effective date: 2 October 2026

1. What this policy covers
This Privacy Policy explains how DestiVerse Vision handles personal information when you use our apps, website, and related services.

2. Information we collect
We may collect account details such as your email address, display name, and authentication information; viewing activity such as watch progress, saved items, and interactions; information you submit through support or creator tools; device and browser details used for security and troubleshooting; notification preferences and a browser push-subscription identifier if you choose to enable device notifications; and payment-status information needed to confirm a purchase. Payment card details are handled by the payment provider, not by DestiVerse Vision.

3. How we use information
We use information to provide and secure the service, personalise core features such as watchlists and progress, process purchases, respond to support requests, send service and device notifications when you opt in, moderate content, prevent abuse, and improve the app.

4. Service providers and third parties
We may use trusted providers to operate parts of the service, including hosting and authentication, payment processing, optional cloud-storage connections you initiate, analytics, advertising, and consent management. These providers may process information only as needed to provide their services. Third-party links and embedded services are governed by their own privacy policies.

5. Advertising and consent
The free version of the service may display advertising. Where required, we request and respect your consent choices through an approved consent-management platform. Advertising partners may use cookies or similar technologies subject to your choices and their policies.

6. Your choices and rights
You can update account details and notification preferences in the app. You can disable browser notifications through your device or browser settings. You may request access, correction, deletion, or other privacy assistance through Help & contact. We may need to verify your identity before completing a request.

7. Retention and security
We retain information only for as long as reasonably needed for the purposes above, legal obligations, dispute resolution, and security. We use reasonable safeguards, but no online service can guarantee absolute security.

8. Changes and contact
We may update this policy as the service changes. The effective date above shows the latest version. For questions, contact us through the Help & contact page.
$privacy$),
  ('terms_of_service', $terms$
Effective date: 2 October 2026

1. Acceptance
By creating an account or using DestiVerse Vision, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the service.

2. Your account
Provide accurate information, protect your sign-in details, and tell us promptly if you believe your account has been accessed without permission. You are responsible for activity carried out through your account where allowed by law.

3. Permitted use
Use DestiVerse Vision lawfully and respectfully. Do not interfere with the service, bypass access controls, copy or redistribute content without permission, infringe intellectual-property rights, upload harmful or unlawful material, impersonate others, or harass users or creators.

4. Content and moderation
Content remains subject to the rights of its owners. If you submit content, you confirm that you have the necessary rights to do so and grant us the permissions needed to host, review, display, and operate that content within the service. We may review, restrict, remove, or refuse content or accounts that breach these Terms, law, safety requirements, or platform policies.

5. Purchases and subscriptions
Prices, features, and availability may change. Payments are processed by our selected payment provider. Refunds, renewals, and cancellations are subject to the terms shown at purchase and any applicable law.

6. Third-party services
The service may link to or integrate with third-party services. We do not control those services and are not responsible for their content, availability, or policies.

7. Service changes
We may change, suspend, or discontinue features or content when reasonably necessary, including for security, legal, licensing, or operational reasons.

8. Disclaimers and liability
The service is provided on an "as available" basis to the extent allowed by law. Nothing in these Terms removes rights that cannot legally be excluded. To the extent permitted by law, DestiVerse Vision is not liable for indirect or consequential loss arising from use of the service.

9. Contact and changes
We may update these Terms and will publish the current version in the app. For questions, use Help & contact.
$terms$)
on conflict (key) do update
set value = excluded.value
where btrim(public.app_settings.value) = '';
