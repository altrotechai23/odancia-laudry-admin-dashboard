# Odancia Laundry — Phase 5 tablet, payment-history, and operator attribution update

## Requested workflow

- Dashboard login remains limited to active owner/admin profiles.
- Admin/owner passcode `0000` authorizes the service operation as the currently authenticated admin. Each write's `created_by`, `updated_by`, payment `received_by`, and supplemental audit entry use that admin's own profile ID/name.
- A staff member's unique four-digit code (not `0000`) authorizes a service write only if the staff profile is active and has an open shift.
- Viewing services and payment history requires no passcode.
- Service table cells are full-surface links on wide displays; under desktop widths the list switches to two-column, fully clickable cards for iPad/tablet and mobile touch navigation.
- Balance displays the service balance plus individual payments (method/type, amount, and operator) in the list and on the service detail page.
- Service detail payment history shows transaction amount, method, stage, timestamp, recorded operator name and role, and reference/notes when available.
- Route loading boundaries show animated shimmer placeholders. Reduced-motion preferences are respected.
- The original Odancia logo and red/blue theme are kept.

## Database change

After the original Phase 4 setup migration has been fully applied, run this complete follow-up migration in Supabase SQL Editor:

`supabase/migrations/202610280002_admin_code_payment_attribution.sql`

It replaces the atomic payment RPC's actor validation, allowing either the currently logged-in owner/admin authenticated with `0000` or the verified active staff member on duty. Admin actors must match `auth.uid()`; staff actors must have an open shift. Existing payment rows are not modified or deleted.

## Validation status

- TypeScript/TSX syntax transpilation: passed for all source files.
- Full `tsc`, lint, and production build: not completed because `npm ci` timed out and the package installation was incomplete in this execution environment.
- The SQL was reviewed for completeness but not run against the live Supabase project. Apply it to staging first and verify the RPC result.
