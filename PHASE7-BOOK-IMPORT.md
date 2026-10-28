# Phase 7 — import historical services and emphasise collection scheduling

## Included

- Admin-only `/dashboard/services/import` with JSON upload, preview, validation results, duplicate skipping and row-level failure report.
- JSON list formats are accepted as either `[{ ...service }]` or `{ "services": [{ ...service }] }`.
- The import supports common aliases for customer names/phones, service type, prices, service/collection dates, collection time, status, fulfillment, notes, and historic payment arrays.
- Existing customers are reused by phone where supplied; missing customers are created. Service types are reused by case-insensitive name; missing names are added as service types.
- Historical payment records are entered in `payments` so the existing ledger-trigger remains the source of truth. The current logged-in admin is the receiver/operator and is written to audit logs.
- Re-importing source records is guarded by an `import_source_key` unique index. Records with an explicit source ID/order/service number use that stable value; records without one use row position plus canonical JSON. Keep the same record order for repeat imports of rows that have no source identifier.
- `collection_time` is added to services, shown with a strong red/blue visual on the Services table/cards and service details, included in new-service creation, and available to SMS messages when the time is known.
- New regular service creation requires a collection time. Historical book records may omit it; the app displays `Time not recorded` rather than inventing a time.

## Before first run

1. Back up Supabase.
2. Apply the full migration `supabase/migrations/202610280004_book_import_collection_time.sql` in the project's SQL Editor.
3. Ensure the server has `SUPABASE_SERVICE_ROLE_KEY` configured privately.
4. Run `npm ci`, `npm run lint`, `npm run build`, and `npm run dev`.
5. Use the downloadable template at `/book-services-example.json`; test with a few sample services before importing the full book.

The importer is admin-only and requires code `0000`; imported service/payment entries are attributed to that currently logged-in admin. Existing services and payments are not updated or deleted by import. Duplicate keys are skipped. If a row cannot be imported, the UI reports the original row number and reason; earlier successful rows remain imported, so fix failed rows and rerun the same file (successful rows should be skipped).

## Status / validation

- TypeScript/TSX syntax-transpilation check: passed for 75 source files.
- Full `tsc`, ESLint and production build: not verified here because `npm ci` timed out and the partial `node_modules` directory lacks `eslint` and several type definitions.
