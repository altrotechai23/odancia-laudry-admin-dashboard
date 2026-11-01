# Odancia Laundry — Meta WhatsApp Cloud API

The app sends a custom text invoice message after a service is created and a ready-for-collection message when a service status changes to `ready_for_collection`. Notifications are best-effort: WhatsApp delivery failure does not roll back a saved service or status update. No database migration is required.

## Environment variables

Set these on the server/deployment platform (never use `NEXT_PUBLIC_`):

- `META_WHATSAPP_ACCESS_TOKEN`: a valid Meta access token with WhatsApp messaging permissions; use a durable System User token for production.
- `META_WHATSAPP_PHONE_NUMBER_ID`: the Phone Number ID shown in WhatsApp Manager / the Meta app, not the public phone number.
- `META_GRAPH_API_VERSION`: optional Graph API version override; defaults to `v22.0` in this implementation.

After setting variables, redeploy. The dashboard's Settings → Notifications page only checks whether the required values exist; it does not expose the token.

## WhatsApp messaging policy

The app currently sends free-form text messages. Meta generally permits free-form replies within the 24-hour customer-service window after a customer messages the business. Outside that window, business-initiated messages must use an approved WhatsApp message template. Therefore, for reliable automatic invoice/ready notifications sent at any time, create and approve suitable utility templates in WhatsApp Manager and update the sender implementation to submit template messages with the exact approved template names, language and parameters. Do not assume a successful API submission means the message was delivered; check WhatsApp message status/webhooks in production.

Only message customers who have opted in to receive WhatsApp messages from Odancia Laundry. Test first with a permitted recipient and the correct Meta business/phone-number configuration.
