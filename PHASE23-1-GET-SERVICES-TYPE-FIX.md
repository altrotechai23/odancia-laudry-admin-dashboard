# Phase 23.1 – getServices mapper type fix

## Fix
`LaundryService` now receives `price_pending` and `service_items` from the `mapService` mapper in `lib/services/get-services.ts`.

- `price_pending` is normalized to a boolean from the service row.
- `service_items` is normalized to an array; legacy services without item rows return `[]`.
- Item numeric values are converted to numbers while nullable unit prices and line totals remain `null`.

This resolves the TypeScript mismatch reported by Vercel at `lib/services/get-services.ts(281,3)` without changing the database schema or existing service/payment records.

## Verification
The source change was inspected. A fresh dependency install timed out in this environment, so a complete local `next build` could not be run. Run `npm ci` and `npm run build` in CI/Vercel to verify the full project.
