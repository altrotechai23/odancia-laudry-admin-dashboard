# Odancia Laundry — Supabase database notes

## Important: use the simplified admin/staff workflow

Apply this complete migration in Supabase SQL Editor after taking a database backup:

`migrations/202610280001_admin_session_staff_passcodes.sql`

Copy and run the entire file as one query. Do not copy individual PL/pgSQL lines, such as a line beginning with `CASE` or `RETURNS jsonb`.

This migration is additive and re-runnable. It preserves existing customer, service, and payment rows. It ensures the express-service columns exist, adds staff address/contact fields, adds shift attendance and private four-digit passcode lookup tables, creates short-lived write-authorization tickets, and replaces the payment batch RPC with a version aligned with the admin-session model. The final query reports each required object as `OK` or `MISSING`.

## Simplified workflow

- Only active owner/admin profiles may sign in to the dashboard.
- Staff are records managed by an administrator; staff do not sign in.
- A signed-in admin can clock multiple team members in or out. One open shift per staff member is allowed.
- All active owner/admin accounts use the fixed master passcode `0000` for service writes. The action is always attributed to the administrator actually logged in on that device/session.
- Staff choose a unique four-digit code other than `0000`; the raw code is never stored. Its keyed HMAC authorizes service write operations only while that staff member is active and clocked in.
- A passcode is required when creating a service, changing service status, or recording payment transactions. Reading service and payment data does not require a code.
- Payment transactions remain in the existing `payments` ledger and existing triggers recalculate service totals. The service list and service details show the payment method, amount, timestamp, and recorded staff/admin operator whenever the payment row has `received_by` set.
- Tablet layouts use full-card navigation below desktop width, and route loading states use a shimmer skeleton to make navigation feedback immediate.

After the Phase 4 setup migration has fully completed, apply the following attribution update as a second complete SQL query:

`migrations/202610280002_admin_code_payment_attribution.sql`

This second migration replaces the split-payment RPC so `0000` payments are attributed to the currently logged-in administrator while staff-code payments are attributed to the on-duty staff member. It does not update or delete existing payment rows.

## Earlier migrations

The earlier phase migration files are retained as project history. Because workflow design has since been simplified, use the complete `202610280001_admin_session_staff_passcodes.sql` migration as the setup entry point for this simplified version. Do not run a copied fragment from an earlier migration.

## Environment

The server must have these environment variables configured in `.env.local` for local development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (used by the current server Supabase client)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only secret, never prefix with `NEXT_PUBLIC_`

Never commit `.env.local` or send service-role keys in screenshots or chat.
