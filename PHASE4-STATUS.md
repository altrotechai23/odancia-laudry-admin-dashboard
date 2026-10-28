# Odancia Laundry — Phase 4 baseline (superseded by Phase 5)

The current project update is documented in `PHASE5-STATUS.md`.

Phase 4 introduced the simplified admin-only login, staff shift management, and four-digit staff passcode workflow. Phase 5 adds the administrator master code `0000`, current-session admin attribution, visible payment transaction history, full-cell service navigation and tablet-focused loading skeletons.

## Database migrations

For a new staging database, apply the complete `202610280001_admin_session_staff_passcodes.sql` setup migration first. Then apply the complete `202610280002_admin_code_payment_attribution.sql` follow-up migration. Do not run snippets that start with PL/pgSQL keywords such as `CASE` or `RETURNS jsonb`; run each complete file as a single SQL Editor query.

## Validation

Source syntax transpilation passed for all TypeScript/TSX files in the Phase 5 update. Full type-check, lint, and production build have not been verified because dependency installation timed out in this environment. No live Supabase database was modified by the ZIP creation process.
