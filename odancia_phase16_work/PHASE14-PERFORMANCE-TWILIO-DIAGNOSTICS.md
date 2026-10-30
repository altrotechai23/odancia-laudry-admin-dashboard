# Phase 14 — Responsive diagnostics and Twilio SMS test

This version is built directly on the working `payment-stage-fix` baseline. The payment-stage migration and all existing service/payment behavior are retained.

## Focused changes

- Added the previously linked `/dashboard/settings/notifications` page, restricted to owner/admin users.
- The page checks whether `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are present on the server without exposing their values.
- Added a manual test SMS action with a fixed message. It uses the existing phone normalization and Twilio sender path.
- Twilio API failures now return the provider's message plus available Twilio error code/HTTP status, making common configuration, sender, recipient and account restrictions easier to diagnose.
- The test UI is responsive, displays pending/error/success states, and explains that a message accepted by Twilio is not necessarily delivered.
- No database migration or new dependency is required. No Twilio credentials are added to the project.

## SMS troubleshooting

1. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in the server/deployment environment (not `NEXT_PUBLIC_*` variables), then restart/redeploy.
2. Visit **Settings → Notifications** and send a test to a phone you control.
3. If it fails, use the returned Twilio error code and inspect the matching message in Twilio Console.
4. If Twilio accepts the request but the handset receives nothing, check the message's final delivery status and any carrier/destination/regulatory restrictions in Twilio Console. Upgrading the account alone does not guarantee SMS delivery.
5. Verify the configured sender is an SMS-capable Twilio number on the same account as the credentials. If the account is still trial/restricted, the recipient may need verification.

## Existing performance baseline retained

Phase 13's route loading states, streaming/Suspense, responsive login layout, service list optimistic filters, reduced-motion support and lightweight transitions are retained unchanged. This patch deliberately avoids a broad dashboard rewrite while SMS delivery is diagnosed.

## Validation checklist

- Run `npm ci`, `npm run lint`, and `npm run build` in the target environment.
- Test the Notifications page on mobile and desktop.
- Test a valid South African number in local format and E.164 format.
- Test missing credentials and a known invalid/unverified recipient to verify actionable errors.
- Confirm normal service creation and ready-for-collection transitions still succeed when SMS fails.
- Confirm payment recording remains functional; no payment code or payment migration was changed.
