# Phase 22 — Meta WhatsApp authentication and audit log constraint fix

## What the logs mean

- Meta HTTP 401 / Graph error 190 means the access token was rejected (commonly expired, revoked, or generated without the needed WhatsApp permissions). This cannot be repaired by changing the phone recipient or retrying the same token.
- `audit_logs_action_check` is a Supabase/Postgres check constraint rejecting the application's action string. The migration in this phase replaces the constraint with the action names used by the current app.

## Apply the Supabase migration

Run `supabase/migrations/202611010001_fix_audit_logs_actions.sql` against the same Supabase project used by production. If you do not use the Supabase CLI migration workflow, open Supabase Dashboard → SQL Editor and run the SQL in that migration. Confirm the SQL succeeds before retesting. The migration must be applied to the live database; deploying Next.js alone does not apply SQL migrations.

## Fix Meta token

1. In Meta for Developers, open the correct app and WhatsApp API setup / business settings.
2. Generate a new valid access token for the WhatsApp Business Account and verify it has `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
3. Confirm `META_WHATSAPP_PHONE_NUMBER_ID` is the **Phone Number ID** belonging to that same WhatsApp account, not the displayed telephone number.
4. Update `META_WHATSAPP_ACCESS_TOKEN` and `META_WHATSAPP_PHONE_NUMBER_ID` in `.env.local` for local development and in Vercel → Project → Settings → Environment Variables for each deployed environment.
5. Redeploy Vercel so the server runtime receives the new values. Never commit or share the access token.

The WhatsApp sender now logs a clearer remediation hint for error code 190. It does not log the token itself.

## Test

- Run `npm install` and `npm run build` from the project root.
- Update a test service to Ready for Collection and check logs. A successful API response means Meta accepted the message request; delivery status may still need checking in WhatsApp/webhooks.
- Check the audit log no longer reports `audit_logs_action_check`.
