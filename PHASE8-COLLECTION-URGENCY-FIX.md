# Phase 8 — collection schedule and service urgency fix

## Changes

1. Fixed JSON parsing for combined collection datetime fields such as `collection_at: "2026-10-29T15:30:00+02:00"`; the time portion is saved rather than discarded. The import preview now displays both date and time for combined fields.
2. Re-importing a previously imported row can backfill a missing collection date/time from the JSON file. It never overwrites a date or time already present in the database. Backfills are reported in `Schedules completed` and logged with the current admin as actor.
3. Added a collection schedule editor to each service detail page. It lets an admin/on-duty staff member fill dates and times for historical records without inventing values; uses the standard 4-digit code and writes an audit record.
4. Added sorting options to the Services page. Default `Urgency (recommended)` sorts open services by actual deadline, using the expected completion time for express jobs and collection date/time for regular jobs, with completed/collected services at the bottom. Additional options: collection soonest, express first, newest first.
5. Improved JSON file selection UX for iPad/iOS by using a label-backed file input and allowing common text MIME types, validating JSON content after reading. Selecting the same file again after a parse error is supported.
6. Fixed payment passcode feedback: the old error is cleared when a new payment is opened or the passcode is edited; after a failed save, the entered code is retained for correction instead of leaving an error beside an empty field.
7. Improved the fallback import key so adding collection date/time or payment history to a previously imported record won't change its identity when there is no explicit book/service ID. This lets duplicate imports backfill schedule fields without needlessly inserting a new service.

## Existing schedule data

Rows that were previously stored without collection time cannot have the original time inferred safely. They now can be repaired manually on the service details page. If the source JSON does contain date/time fields, upload the same file again: already-imported rows remain deduplicated, while missing collection values are backfilled.

## Migration

No new SQL migration is included. This update relies on Phase 7's existing `collection_time` and `import_source_key` columns plus staff operation authorization/audit tables from the earlier phases. Confirm the previous migrations have been applied before using these features.

## Verification

Run `npm ci`, `npm run lint`, `npm run build`, then test: a JSON record with separate date/time fields; a record with `collection_at` containing an ISO datetime; a duplicate row whose previously missing time is now backfilled; an admin updating a legacy service schedule using `0000`; incorrect passcode followed by reopening the payment dialog; and sorting with normal, express, overdue, unscheduled, and collected records.
