# Phase 23 — Multi-item services, pamphlet menu, client editing

This update is based on the supplied Phase 22 project and preserves the existing service, payment, staff authorisation, WhatsApp, dashboard and audit workflows.

## Application changes

- A single service can contain multiple service items, each with its own type, quantity and negotiated unit price. The items share one service reference and invoice total.
- Pamphlet services are seeded in pamphlet order with the pamphlet prices displayed as defaults. Staff can change the default price per item.
- Any item can be marked **Price pending**. The service can be saved, but payment is blocked until all pending prices are confirmed. Confirming prices recalculates the combined service total and balance.
- Service details show each line item. Service lists show a combined service description and display **Price pending** when applicable.
- Client edit page now supports updating contact details and has an **Add service** link. The new-service form opens with that client preselected.
- Schedule fields are displayed as a two-column, two-row layout at tablet widths, matching the supplied iPad landscape reference.

## Required Supabase migration

Before deploying this code, apply:

`supabase/migrations/202611030001_multi_item_services_and_pamphlet_menu.sql`

This migration adds `services.price_pending`, creates `service_items`, adds display ordering for service types, seeds the pamphlet menu and permits the new price-confirmation audit actions. It does not delete existing services or payment rows.

Apply it to the same Supabase project used by the app (staging first if available), then redeploy the Next.js application. The migration is not run automatically by Vercel.

## Build verification

A full Next.js build could not be completed in this environment because dependencies were not installed and the npm registry request timed out; offline installation also reported that `libphonenumber-js` was not cached. Run `npm ci` and `npm run build` in the project environment after downloading the ZIP. Do not deploy until the build succeeds and the migration has been applied.
