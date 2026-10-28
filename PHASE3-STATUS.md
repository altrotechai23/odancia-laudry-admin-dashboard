# Odancia Laundry — Phase 3 status

## Included

- Corrected `/dashboard/staff/new`: it now creates a Supabase Auth staff account and upserts a matching profile, rather than inserting a customer record.
- Staff profile creation captures full name, phone, physical address and optional contact email.
- Staff passcodes are 8–12 digits; a private keyed HMAC lookup supports passcode-only login without requiring an email or username on the sign-in screen. Supabase Auth retains the password hash.
- A random personal barcode is generated for staff; only its SHA-256 hash is stored. The raw code is displayed once after creation for printing/saving.
- Owners/admins continue to sign in with email and password.
- Added staff shift clock-in/out UI, server-side barcode verification for shift actions, unique-open-shift enforcement and audit logging.
- Added the live on-duty list to the admin/owner overview dashboard; multiple staff can be on duty at once.
- Staff service creation, service status changes and payment batches ask for barcode verification. Server actions validate the barcode and active shift; migration RLS restrictions also require a short-lived authorization record.
- Added optional passcode reset, personal-barcode rotation, address and contact-email fields to staff profile editing. A rotated barcode is shown once and the old barcode is invalidated.
- Staff accounts are rejected by the owner/admin email-password form and must use the passcode-only option.
- Added migration `202610270003_staff_passcodes_shifts_barcode_gate.sql`, including explicit post-migration verification rows.
- Added actor-attributed staff creation/update audit entries and best-effort cleanup of old passcode login attempts.

## Migration / deployment

Apply `supabase/migrations/202610270003_staff_passcodes_shifts_barcode_gate.sql` in staging first. Keep Phase 1 and Phase 2 migrations only if not already applied. Verify your current `services` columns separately; the previous Phase 2 fix was confirmed by the user to return all four express columns.

## Validation caveat

I could not complete `npm ci` or a production build in this environment because package installation timed out. Run `npm ci`, `npm run lint`, and `npm run build` before production deployment. Test the migration and workflows in staging before using this build with live data.
