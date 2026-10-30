# Phase 16 — Admin dashboard UX and reports

Based on Phase 15. This phase is focused on dashboard usability and does not intentionally change service, payment, or notification business logic.

## Changes

- Service filters update automatically: sort changes apply immediately, status chips apply immediately, and search updates after a short debounce. The explicit Apply button was removed.
- Added an administrator/owner-only `/dashboard/reports` page using the existing service data access layer.
- Reports include period selection (7/30/90 days or all time), service value, payments recorded, outstanding balance, average service value, service activity, status distribution, recent services, and CSV export.
- Added a route-level loading skeleton and a streamed report-content fallback.
- UI uses responsive cards, touch-friendly controls, horizontal table scrolling on smaller screens, and accessible labels.
- Staff users are redirected away from reports and the existing role-based navigation only displays Reports to admin/owner roles.

## Validation

Dependency installation (`npm ci --ignore-scripts`) timed out in the build environment, so lint/build could not be run here. Run `npm ci`, `npm run lint`, and `npm run build` locally before deployment. No database migration is required.

## Smoke tests

1. As an admin/owner, open Reports and change the report period; the page should update without an Apply button.
2. As staff, navigate directly to `/dashboard/reports`; the app should redirect to `/dashboard/services`.
3. On Services, change sort/status and type a search query; each should apply automatically.
4. Verify CSV export and service detail links.
5. Re-test service creation and deposit/exact-balance payments to confirm the baseline remains intact.
