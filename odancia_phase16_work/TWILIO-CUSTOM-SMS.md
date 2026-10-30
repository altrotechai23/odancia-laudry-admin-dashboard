# Twilio Custom SMS (Phase 11 restored)

This package is based on **Phase 11**. It deliberately removes the Meta WhatsApp Cloud API work and the `react-phone-number-input` dependency/import that caused the stylesheet resolution failure. It adds environment-configurable custom SMS text to the Twilio notification flow already used by the app.

## What sends automatically

- When a service is successfully created, the app calls `sendNewServiceSms`.
- When a service status changes to `ready_for_collection`, the app calls `sendReadyForCollectionSms`.
- The notification is best-effort: if Twilio cannot send, the service create/status operation is not rolled back.

Messages are ordinary **SMS**, not WhatsApp. Standard SMS is text-only and cannot embed the Odancia logo or attach an invoice PDF. The SMS body is branded with the business name and can include the service reference, collection schedule, totals and balance. If a PDF invoice is needed later, the simplest addition would be a secure link to a hosted invoice.

## Configure Twilio

Copy the relevant values from `.env.twilio.example` into your existing private `.env.local`:

```dotenv
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+27...
TWILIO_TRIAL_MODE=true
```

`TWILIO_PHONE_NUMBER` should be the outbound Twilio SMS-enabled number in E.164 format. Trial accounts may be restricted to verified recipients; check your Twilio Console. Never commit `.env.local` or expose these secrets to browser code.

Restart the Next.js server after changing environment values.

## Customize the two message bodies

Optional environment settings let you customize the new-service and ready-for-collection texts without a database migration:

- `TWILIO_NEW_SERVICE_SMS_TEMPLATE`
- `TWILIO_READY_FOR_COLLECTION_SMS_TEMPLATE`

Use literal `\n` where a line break should appear. Example:

```dotenv
TWILIO_NEW_SERVICE_SMS_TEMPLATE=ODANCIA LAUNDRY\nHi {{customerName}}, service {{serviceReference}} is booked. Collection: {{collectionDate}} at {{collectionTime}}. Total {{totalPrice}}, paid {{amountPaid}}, balance {{balance}}.
TWILIO_READY_FOR_COLLECTION_SMS_TEMPLATE=ODANCIA LAUNDRY\nHi {{customerName}}, service {{serviceReference}} is ready on {{collectionDate}} at {{collectionTime}}. Balance: {{balance}}. {{balanceMessage}}
```

Supported placeholders:

- `{{businessName}}`, `{{customerName}}`, `{{serviceName}}`, `{{serviceDescription}}`
- `{{serviceReference}}`, `{{serviceDate}}`, `{{collectionDate}}`, `{{collectionTime}}`
- `{{numberOfItems}}`, `{{fulfillmentMethod}}`, `{{totalPrice}}`, `{{amountPaid}}`, `{{balance}}`, `{{balanceMessage}}`

If a template is not configured, the built-in Odancia SMS body is used. Unknown placeholders become blank. Long SMS templates may be split into multiple billable message segments, so keep custom messages concise.

## International telephone numbers

No phone-input package is required. The existing telephone field accepts international numbers; use the plus sign and country calling code for overseas recipients, for example `+44 20 ...`. South African local numbers such as `0712345678` are converted to `+27712345678` when sent. International numbers are checked for E.164 shape, but the app does not infer an overseas country code if the plus/country prefix is omitted.

## Database and deployment

- No new Supabase migration is required for this Twilio SMS customization.
- Keep all Phase 11 migrations and previous service/payment data as-is.
- This package does not include Meta WhatsApp integration, WhatsApp consent fields, invoice PDF upload, a WhatsApp webhook, or `react-phone-number-input`.
- Test with a verified number first, then test service creation and the `Ready for collection` transition before production use.
