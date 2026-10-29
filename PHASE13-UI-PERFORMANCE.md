# Phase 13 — service details, UI responsiveness and partial loading

This update is based on the Phase 11 + Twilio project and keeps existing service, payment, staff and notification behavior. No database migration or new package is required.

## Changes

- Service details now show **Collection date** and **Collection time** beside service date/time, with Odancia blue/red emphasis. The Collection panel and schedule editor remain available.
- Service-list search, sorting and status tabs moved into a small client component. It uses React `useOptimistic` to reflect the pending filter state immediately while Next.js navigates to the server-filtered result.
- Dashboard staff attendance is rendered behind a React Suspense boundary; the overview heading can render while the attendance queries resolve. Existing route `loading.tsx` shimmer states remain in place for services and service details.
- Dashboard route changes have lightweight CSS transitions and cards use staggered entrance and hover feedback. Reduced-motion preferences are respected.
- The login screen uses a viewport-height layout with compact styles for shorter screens, keeping the logo and login form centred without document scrolling on standard mobile/tablet/desktop viewports.
- No `experimental_ppr` setting was added. In Next.js 16, the experimental Partial Prerendering flag/configuration was removed; supported streaming and Suspense are used instead. See https://nextjs.org/docs/app/guides/upgrading/version-16 and https://nextjs.org/docs/app/api-reference/file-conventions/loading.

## Validation

- Source syntax transpilation check performed for all `.ts`, `.tsx`, and `.js` files.
- Archive integrity checked after packaging.
- Full Next.js build/lint should still be run locally with `npm ci`, `npm run lint`, and `npm run build`.

## Manual test checklist

1. Open any service with collection date/time populated; confirm both values appear in the Laundry service details block. Open one with a missing schedule; confirm “Not recorded” and use the schedule editor to save the real promised schedule.
2. In `/dashboard/services`, switch status filters, search, and sort; controls should update immediately and show an updating indicator while the server view transitions.
3. Navigate to `/dashboard`; the header should render while the attendance panel displays its skeleton, then show on-duty staff.
4. Test login on a short mobile viewport and a tablet portrait/landscape viewport; logo and form should stay centred without page scrolling.
5. Check that reduced-motion OS settings disable entrance animations.
