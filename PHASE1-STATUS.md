# Odancia Laundry — Phase 2 status

This update builds on the existing application and the Phase 1 payment-ledger changes.

## Included in this update
- Express-service selection on the new-service form. The agreed standard price is retained as `base_price`; express total is calculated at exactly double.
- Express services receive an earliest target at creation time + 2 hours and a latest target at + 4 hours. The service list and detail view show express status and target window.
- The service payment dialog supports one to four payment lines, each with its own amount and payment method.
- A new database RPC validates the authenticated active staff profile, locks the service row, checks the outstanding balance and records the entire split-payment batch in one transaction. Existing payment triggers continue to recalculate service totals.
- Existing services are backfilled with `base_price = total_price`; existing payment rows are not rewritten or removed.

## Migration required
Apply `supabase/migrations/202610270002_express_and_split_payments.sql` in staging before running this version. Do not apply it to production until backup and test verification are complete.

## Not yet included
- Full staff passcode-only authentication.
- Integrated barcode prompts for every protected write.
- Staff clock-in/out UI and live on-duty dashboard list.
- Atomic service creation plus initial deposit.
- Full loading-state/performance and iPod/mobile QA pass.

## Validation status
The source ZIP opens successfully. A production build and full TypeScript check could not be completed in this environment because dependency installation timed out and required local packages/type definitions were unavailable. Run `npm ci`, `npm run lint`, and `npm run build` in a normal development environment before deployment.
