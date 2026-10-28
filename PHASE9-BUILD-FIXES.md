# Phase 9 — Lint, TypeScript and tablet-toolbar fixes

This phase addresses errors reported when running `npm run lint` and `npm run build` against Phase 8.

## Changes

- Removed redundant effect-driven state resets from service status, collection-schedule and staff-edit forms; passcode cleanup now happens in action callbacks or when the form/dialog is opened.
- Wrapped service creation in an action callback so the one-time staff authorization code is cleared after the action completes.
- Replaced the internal services-page anchor in the book importer with `next/link`.
- Escaped the apostrophe in the collection-time helper text.
- Moved the current-time snapshot to the service data-fetch helper and pass it into urgency badges instead of calling `Date.now()` in a rendered component.
- Added the missing SMS clock-time formatter used by booking and ready-for-collection text.
- Narrowed the resolved client ID before the importer caches it, addressing `string | undefined` TypeScript errors.
- Removed unused service-detail/list components and icon imports reported by lint.
- Reworked the services sort controls into a responsive grid, keeping Sort, selection and Apply aligned at tablet/iPad widths.
- Updated password-reset navigation to use Next.js router navigation.

## Verification

- TypeScript/TSX syntax transpilation: all 77 source files passed with zero syntax diagnostics.
- Full ESLint and TypeScript checks could not run in the packaging environment: `npm ci` timed out and the local dependency tree was incomplete. Run `npm ci`, `npm run lint` and `npm run build` on the target Windows machine to complete validation.
- No Supabase migration is required for these changes.
