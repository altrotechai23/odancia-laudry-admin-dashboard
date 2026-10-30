# Phase 17 — Urgency, Interactive Reports, Clickable Clients

- Urgency sort now filters out collection dates before today's date in the `Africa/Johannesburg` timezone. Dates today remain eligible from 00:00 onward; services with no collection date remain visible.
- Service activity bars are buttons. Selecting a bar opens an animated, responsive dialog with that day's services, statuses, values, and links to service details.
- Client list rows now have a full-row navigation target on desktop and mobile. Phone and email links remain individually usable.
- No database migrations or payment/service business-logic changes are included.

Validation: source-level changes made; production build not run in this environment. Run `npm ci` and `npm run build` before deployment.
