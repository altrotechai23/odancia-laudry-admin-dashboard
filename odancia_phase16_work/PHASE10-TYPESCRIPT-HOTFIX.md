# Phase 10 — Importer nullability and SMS formatter hotfix

This update directly targets the TypeScript errors reported by the Windows build.

## Fixes

- Collection date/time values are explicitly normalized to `null` at database/audit boundaries, so optional schedule fields cannot leak `undefined` into those records.
- Existing-service schedule cache values are normalized the same way.
- The SMS clock formatter is defined at module scope near the top of `lib/notifications/service-sms.ts` as `formatSmsClockTime`, and both SMS templates use that exact name. This avoids depending on a stale or differently scoped `formatClockTime` definition.

## Apply safely

1. Extract this ZIP into a **new folder** (do not overlay it onto an old extraction).
2. Copy only your existing `.env.local` (and `.env` if you use one) into the new folder. Never share those files.
3. Run `npm ci`, `npm run lint`, and `npm run build` from the new folder.
4. No database migration is required for this source-only fix.

## Validation status

- The ZIP archive integrity check passed.
- TypeScript syntax transpilation was run over all `.ts` and `.tsx` source files.
- A full project semantic type-check/production build could not be completed in the packaging environment because dependency installation timed out. Please use the commands above on the Windows machine to confirm the full build.
