# Phase 11 — Build Hotfix

This patch addresses the errors found when running `npm run lint` and `npm run build` on Phase 10.

- Passes the page's `asOf` timestamp into `ServiceRow` and `ServiceCard`, where `UrgencyFlag` consumes it. This removes the undefined identifier type errors and the unused page-level warning.
- Declares the staff passcode state before defining the `useActionState` callback that closes over `setPasscode`, avoiding the React Hooks immutability lint error.

No Supabase migration or data change is required.

Run locally:

```bash
npm ci
npm run lint
npm run build
```

The earlier `import-book-services.ts` and `service-sms.ts` fixes are retained.
