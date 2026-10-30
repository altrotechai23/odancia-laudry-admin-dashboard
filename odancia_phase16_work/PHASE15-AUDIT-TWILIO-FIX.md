# Phase 15 — Audit action constraint and Twilio trial diagnostics

This phase is based on the working Phase 14 ZIP and preserves the payment-stage fix, payment RPCs, service workflows, and Phase 13/14 responsiveness work.

## Focused changes

- Added `supabase/migrations/202610290002_fix_audit_log_action_constraint.sql`. It discovers the existing `public.audit_logs.audit_logs_action_check` definition and extends it with the audit action values currently written by the application, preserving the original condition.
- Improved the Twilio SMS error returned for error `572006`. The UI now explains that Twilio is treating the configured credentials as trial-account credentials and directs the operator to verify that the Account SID and Auth Token belong to the upgraded project.
- No credentials, tokens, or other secrets are included in the ZIP.
- No payment logic or payment migration was changed.

## Required Supabase step

Run the complete migration `supabase/migrations/202610290002_fix_audit_log_action_constraint.sql` in Supabase SQL Editor. It only changes the audit action check constraint; it does not delete or rewrite existing audit rows.

## Twilio action required outside the code

Twilio error `572006` indicates the request is being handled as a trial-account request. Confirm the project is upgraded in Twilio Console and that the server-side `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in the environment running this app are from that same upgraded project/account. If you update environment variables, redeploy/restart the app. Do not share the Auth Token in support messages.

The app cannot change the account's Twilio billing/upgrade status. If the credentials already belong to the upgraded project, check whether the application is configured with a trial subaccount's SID/token instead.

## Validation

- Inspect the generated SQL migration before applying it to production.
- Run `npm ci`, `npm run lint`, and `npm run build` in the target environment.
- Create a test service and confirm the audit log warning no longer appears.
- Send a test SMS and confirm the returned error changes after the Twilio account/credentials are corrected.
- Re-test deposit and exact-balance payments to verify the preserved payment fix.
