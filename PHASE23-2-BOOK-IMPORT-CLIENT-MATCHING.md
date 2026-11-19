# Phase 23.2 — safe book import matching

- `/dashboard/services/import` now reuses a client only when both normalized full name and normalized phone match.
- Same phone with a different name creates a separate client, protecting records where the paper book used a shared placeholder number.
- Name-only matching is retained only when the source row has no phone and the existing client also has no phone.
- Stable `BOOK-...` service numbers continue to generate idempotent import keys, so a repeat import skips those service rows.
- Payment stage `full` is normalized to the existing final-payment stage.
- Historical express rows where the source repeats the charged total in both `total_price` and `base_price` preserve the charged total and infer half as base price.
- Added `public/odancia-book-import-oct-2026.json` with the 30 records supplied for this import and a download link on the import page.

## Data caveats preserved from the supplied book

- All 30 source service numbers are preserved.
- The shared placeholder phone `+27718385010` is deliberately not used as a standalone customer key.
- The two Azim rows have different phone values in the supplied data, so they remain separate customer records under the exact name+phone matching rule. The source notes already flag them as a possible duplicate; review that pair before or after import if they are the same person.
- Collection times are imported exactly as supplied, including 04:00, 07:00, and 23:00. Notes retain the source uncertainty; no AM/PM correction is invented.
- The three supplied full-payment rows are imported as final payment transactions with the supplied cash method and references.
- The supplied express totals remain unchanged; base price is normalized to half the total for the three express rows where the source repeats the total in `base_price`.

## Deployment

No new SQL migration is required for this matching change. Keep previously applied Phase 7 and Phase 23 migrations in place. Run `npm ci` and `npm run build` before deployment. Import the JSON from the admin page only after backing up the Supabase database.
