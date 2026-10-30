# Phase 6 hotfix — no-deposit balances and payment recording

## Fixes

- Services created without a deposit now initialize `balance` to their total price, `amount_paid` to zero, and `payment_status` to `unpaid` (unless the service total is zero).
- Service summaries derive amount paid from the payment ledger when ledger rows exist, and derive outstanding as `max(total - paid, 0)`. This prevents a stale database balance of zero from incorrectly showing an unpaid service as `Paid in full`. For older records with no payment rows, the existing `amount_paid` value is retained as a compatibility fallback.
- Payment save errors include the actual database message in the authenticated admin UI and log the error code/details/hint on the server. The submitted passcode is not logged.
- The SQL migration repairs genuinely zero-paid, zero-deposit services with no payment-ledger rows and replaces the atomic payment RPC with an admin/on-duty-staff attributed implementation. Existing payment transactions are not deleted or rewritten.

## Supabase migration

Before deploying, back up the database. Apply the complete file `supabase/migrations/202610280003_fix_zero_deposit_and_payment_rpc.sql` in Supabase SQL Editor as one script. Do not select and run a fragment. Confirm the final verification query returns `OK` for both checks.

## Local validation

Run:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Test at least: create a service with no deposit (balance must equal total and status must be `unpaid`), record a single cash payment, record a split cash/EFT payment, and verify the paid/outstanding totals and operator attribution.

The source package was syntax-transpiled in this environment; a full dependency-backed type-check/build was not available here. Test in staging before applying to production.
