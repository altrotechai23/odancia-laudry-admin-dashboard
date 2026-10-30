## Phase 15 — Audit logging and Twilio diagnostics

This version is based on the working Phase 14 build. Apply `supabase/migrations/202610290002_fix_audit_log_action_constraint.sql` in Supabase SQL Editor to allow the audit action values used by the application while preserving the existing constraint. For Twilio error 572006, verify the server-side credentials belong to the upgraded Twilio project; see `PHASE15-AUDIT-TWILIO-FIX.md`. The payment-stage fix is retained.

# Odancia Laundry Admin Dashboard

## Current simplified workflow (Phase 4)

Read `START-HERE-PHASE4.txt` and `PHASE4-STATUS.md` first. The current version uses **admin/owner-only dashboard sign-in**. Staff are managed by an administrator, use administrator-managed check-in/check-out, and have a unique 4-digit code that is requested for service writes—not for reading records.

Before testing the current workflow, back up Supabase and apply the complete file `supabase/migrations/202610280001_admin_session_staff_passcodes.sql` in Supabase SQL Editor. Run the whole file in one query; never copy a fragment from inside a PL/pgSQL function. The migration is intended to preserve existing service/payment rows.

Install and run locally:

```bash
npm ci
npm run lint
npm run build
npm run dev
```

Keep the existing `.env.local` and ensure the server-only `SUPABASE_SERVICE_ROLE_KEY` is present. Never expose it via a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Import services from the paper book (Phase 7)

Administrators can open **Import from book** in the sidebar at `/dashboard/services/import`. Choose a JSON file, review the preview, enter the logged-in admin's `0000` code, and import up to 500 records (file limit 800 KB). The import matches existing clients by phone number when supplied, creates missing customers, reuses service types by name (creates a type if missing), inserts historical payments into the `payments` ledger, and writes an admin audit event. Re-importing the same service records skips them using `import_source_key`.

Before using this page, apply the complete SQL file `supabase/migrations/202610280004_book_import_collection_time.sql` in Supabase SQL Editor. This additive migration adds `services.collection_time` and `services.import_source_key` plus a filtered unique index; it does not delete existing services or payment rows. Run the entire file as one query, not individual lines. New service creation now requires a collection time and the Services table emphasizes collection date/time in red and blue.

Example template: `public/book-services-example.json`. Accepted date values are `YYYY-MM-DD` or South African `DD/MM/YYYY`; time values include `HH:mm` and common `AM/PM` forms. Service rows need a customer name and total/base price. Records without historical collection times remain blank rather than guessing. Imported historic payments are attributed to the currently logged-in administrator because the import action is admin-only.

## Next.js documentation

This application uses Next.js App Router. See [Next.js documentation](https://nextjs.org/docs) for framework information.


## Phase 8 — collection schedule repair and urgency sorting

- Existing services can now have collection date/time added or corrected from the service details page. The change uses the normal four-digit authorization flow and is recorded in audit logs.
- The Services page defaults to urgency sorting. Uncollected services are ordered by their actual deadline; express services use the four-hour expected-completion target and regular services use their promised collection date/time. Collected services fall to the bottom. Use the Sort control to choose collection soonest, express first, or newest first.
- JSON import extracts time from combined `collection_at` / `collection_datetime` fields, improves the file picker for iPad/iOS, and can backfill only missing collection date/time values for records already imported with the same import key. It does not replace schedule fields already recorded.
- Payment authorization messages are reset when the dialog is opened or the passcode is edited, so a stale invalid-code warning does not appear for a new payment attempt.

No new Supabase migration is required for Phase 8 if `202610280004_book_import_collection_time.sql` was successfully applied earlier. That migration adds `services.collection_time` and `services.import_source_key`. The schedule editor uses the existing collection columns and the existing staff-operation authorization/audit tables.

## Phase 9 — build and iPad toolbar fixes

Phase 9 fixes the reported ESLint and TypeScript issues, adds the missing SMS time formatter, narrows client IDs in book import, and aligns service sorting controls on tablet widths. No database migration is required. See `PHASE9-BUILD-FIXES.md` for the change list and validation status.

## Phase 10 TypeScript hotfix

For the latest targeted importer nullability and SMS collection-time formatter fix, see `PHASE10-TYPESCRIPT-HOTFIX.md`. Extract the latest ZIP into a new folder rather than overlaying it on an older copy; copy only your private environment files (`.env.local` / `.env`) into the new folder.


## Phase 11 restored — Twilio custom SMS

This build is based on Phase 11 and intentionally excludes the Phase 12 Meta WhatsApp and phone-input package changes that caused `Can't resolve 'react-phone-number-input/style.css'`. Twilio sends ordinary custom SMS messages when a service is created and when its status changes to `ready_for_collection`.

See `TWILIO-CUSTOM-SMS.md` and `.env.twilio.example` for credential setup and optional configurable message bodies. No additional database migration is required. Customer phone fields remain dependency-free; enter overseas numbers with `+` and the country calling code. Standard SMS cannot contain the logo/PDF attachment itself.


## Phase 13 — service detail and responsive performance polish

- Service details now show collection date and collection time directly in the Laundry service details grid, next to the service date/time fields.
- The Services toolbar uses optimistic controls for status/search/sort navigation so selection feedback is immediate while server-rendered results are updating.
- The dashboard streams the staff attendance section behind Suspense; the existing `loading.tsx` shimmer fallbacks remain active for service routes.
- Dashboard routes and service cards use lightweight CSS motion with reduced-motion handling.
- Login is vertically and horizontally centered in the viewport and uses compact responsive sizing for short mobile/tablet viewports.
- No new dependency or Supabase migration is required. Next.js 16 has removed the experimental PPR configuration flag; this update uses supported React Suspense/Next.js streaming instead of an unavailable flag.

See `PHASE13-UI-PERFORMANCE.md` for the details and manual test checklist.
