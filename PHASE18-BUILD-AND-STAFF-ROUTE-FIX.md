# Phase 18 — Build and Add Staff route fix

## Code fixes
- Imported `Search` from `lucide-react` in the services page.
- Moved report cutoff calculation into a helper so React purity lint does not flag `Date.now()` inside the render body.
- Removed the synchronous state-reset effect from `ServicesControls`; the parent already keys the control by URL filter values so it remounts with the current URL state.
- Removed an unused `CheckCircle2` import and unused report variable.
- Added `react-phone-number-input` and `libphonenumber-js` as dependencies for phone-number UI/validation modules used by the local project.

## Before deploying
From the actual project root, run:

```bash
npm install
npm run build
```

`npm install` must be run once after these dependency changes so `package-lock.json` is regenerated and committed. Do not deploy with a stale lockfile.

## Add staff page
The page is implemented at `app/(dashboard)/dashboard/staff/new/page.tsx`, which maps to `/dashboard/staff/new`. The Staff page links to that exact URL. If the deployed app still shows a 404, make sure the Vercel Root Directory points at the folder containing `package.json` and `app/`, and remove any accidentally extracted nested `odancia_phase16_work/` copy from inside the project root. The duplicate nested project was causing the same source files to be linted twice in the supplied build log.
