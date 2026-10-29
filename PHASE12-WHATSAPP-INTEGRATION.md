# Phase 12 — Meta WhatsApp Cloud API

This phase adds official Meta WhatsApp Cloud API integration to the existing Odancia Laundry Next.js + Supabase app. It does not create a Meta app, register the business phone number, approve message templates, or provision production credentials; those steps must be completed in Meta's dashboards by an account administrator.

## What is included

- International client phone entry via `react-phone-number-input`, using a country selector (South Africa is the initial default) and storing E.164 values such as `+27821234567`.
- Explicit WhatsApp permission on client creation and when adding a service. Existing customers default to **not opted in**; the app does not send automatically until consent is recorded.
- Server-only Meta Cloud API functions to upload a branded invoice PDF and send it with an approved document-header template.
- Automatic ready-for-collection template message only when the service transitions into `ready_for_collection`.
- Signed webhook verification and message delivery status updates (`sent`, `delivered`, `read`, `failed`).
- Database audit/log records and a WhatsApp status history panel on service details.
- Admin settings page at `/dashboard/settings/whatsapp` listing required configuration without exposing secret values.

## 1. Apply the database migration

Back up Supabase, then run the **entire** SQL file below in the Supabase SQL Editor:

`supabase/migrations/202610290001_whatsapp_messaging_and_phone_consent.sql`

The migration adds WhatsApp consent columns to `clients` and creates `whatsapp_message_logs`. It preserves existing clients, services, and payment transactions. Existing clients are not automatically opted in.

## 2. Create/prepare Meta WhatsApp Cloud API assets

In [Meta for Developers](https://developers.facebook.com/apps/):

1. Create/select a Meta app and add the WhatsApp product.
2. In WhatsApp API Setup, select/create the WhatsApp Business Account (WABA), connect a business phone number, and note the **Phone Number ID**. This is the ID shown by Meta, not the actual phone number.
3. Generate a server-side **System User access token** for production and grant the `whatsapp_business_messaging` and `whatsapp_business_management` permissions. Do not use a short-lived test token for a production deployment.
4. Submit the two message templates listed below and wait until Meta has approved them.

A working Cloud API setup requires a Meta business portfolio, WABA, and a registered business phone number. See Meta's [Cloud API documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/) and [official Postman collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api).

## 3. Create and approve the templates

Template names and variable order must exactly match the settings below. The message wording shown here is a suggested starting point; Meta makes the approval decision. Select a Utility category where appropriate and submit representative samples for every variable.

### Invoice PDF

- Name: `odancia_service_invoice`
- Language: `en_US` (or change the environment variable to the exact approved language)
- Header: **Document**
- Body: `Hi {{1}}, your Odancia Laundry invoice {{2}} is attached. Thank you for choosing us.`
- `{{1}}`: customer name
- `{{2}}`: invoice/service reference

The app creates a one-page PDF with the Odancia logo, business contact details, service details, collection schedule, and current payment history, uploads it to Meta as PDF media, and attaches that media ID to the document template.

### Ready for collection

- Name: `odancia_ready_for_collection`
- Language: `en_US` (or the exact approved template language)
- Body: `Hi {{1}}, service {{2}} ({{3}}) is ready for collection. Collection: {{4}}. Outstanding balance: {{5}}. Thank you, Odancia Laundry.`
- `{{1}}`: customer name
- `{{2}}`: service reference
- `{{3}}`: service type
- `{{4}}`: collection date and time
- `{{5}}`: outstanding balance

The app sends this template only on a real status transition to `ready_for_collection`; saving the same ready status again does not send a duplicate notification.

## 4. Environment variables

Copy `.env.whatsapp.example` variables into `.env.local` for local testing and into your hosting provider's **server-side** environment configuration for deployment. Do not add a `NEXT_PUBLIC_` prefix to secrets, do not commit them to source control, and do not paste secret values into chats or issue trackers.

Required to send messages:

- `META_WHATSAPP_ACCESS_TOKEN`
- `META_WHATSAPP_PHONE_NUMBER_ID`
- `META_WHATSAPP_INVOICE_TEMPLATE_NAME=odancia_service_invoice`
- `META_WHATSAPP_READY_TEMPLATE_NAME=odancia_ready_for_collection`
- `META_WHATSAPP_TEMPLATE_LANGUAGE=en_US` (default if omitted)
- `META_WHATSAPP_GRAPH_API_VERSION=v26.0` (default in code; update deliberately when changing Meta Graph API version)
- `SUPABASE_SERVICE_ROLE_KEY` (existing server-side configuration used to write delivery logs; never expose to browser code)

Required for delivery status webhooks:

- `META_APP_SECRET`
- `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN` (a long random string chosen by you)

## 5. Configure the webhook

Deploy the app to a public HTTPS origin, then in Meta App Dashboard → WhatsApp → Configuration set the callback URL to:

`https://YOUR-HOSTNAME/api/webhooks/whatsapp`

Set the same random verify token in Meta and `META_WHATSAPP_WEBHOOK_VERIFY_TOKEN`, verify the callback, and subscribe to the `messages` field. Delivery/read status posts are validated using `META_APP_SECRET` with `X-Hub-Signature-256` before the log table is updated.

## 6. Local test order

1. Apply the migration in a staging Supabase project first.
2. Configure the Meta test number, server-only token, phone number ID, and approved test templates.
3. Create/test a client using an international number and tick the consent checkbox only after explicit permission.
4. Add a service; confirm the `whatsapp_message_logs` row reports `sent`, `skipped`, or `failed` with a safe operator-facing result. `sent` means Meta accepted the message request; webhook updates may later change it to `delivered` or `read`.
5. Move the service to `ready_for_collection`, and verify the second template is sent and its status appears on the service detail page.
6. Test with a client who has not opted in: the service must still be created, no WhatsApp message is sent, and a skipped log is written.

## Policy and operational notes

- Keep the explicit opt-in clear and auditable. Existing clients are defaulted to no permission; never bulk-mark existing clients as opted in without evidence of permission.
- Business-initiated messages require an approved template outside the customer service window. Meta policies also require the proper purpose for templates; follow current Meta policy and local privacy laws.
- WhatsApp API failures do not roll back a service that has already been created or marked ready. The failure is recorded in `whatsapp_message_logs` and visible in service details for troubleshooting.
- If a message log remains `sent`, configure the webhook to receive delivery/read receipts. A successful API response does not itself guarantee final delivery.
