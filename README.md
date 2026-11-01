# Odancia Laundry Admin

## Meta WhatsApp Cloud API notifications

This version uses Meta WhatsApp Cloud API instead of Twilio. When a service is created, the customer receives a custom text invoice message with service reference, collection schedule, total, amount paid and balance. When the service is changed to `ready_for_collection`, the customer receives a ready-for-collection message with the same key details. Notification failures do not roll back service creation or status updates.

Configure `META_WHATSAPP_ACCESS_TOKEN` and `META_WHATSAPP_PHONE_NUMBER_ID` in the server environment. See `WHATSAPP-CLOUD-API.md` and `.env.whatsapp.example`. No Supabase migration is required. Meta requires approved templates for business-initiated messages outside the 24-hour customer-service window; this implementation currently sends free-form text and may be rejected outside that window.

The existing payment-stage fix and previous dashboard/staff/shift features are retained.
