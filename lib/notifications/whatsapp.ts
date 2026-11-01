/* Meta WhatsApp Cloud API notifications. Credentials must stay server-side. */
export type WhatsAppResult = {
  success: boolean;
  skipped: boolean;
  sid: string | null;
  error: string | null;
};

type CommonParams = {
  customerName: string;
  phone: string;
  serviceName: string;
  serviceDescription?: string | null;
  serviceId: string;
  collectionDate: string;
  collectionTime?: string | null;
  numberOfItems?: number | null;
  fulfillmentMethod: "customer_pickup" | "delivery";
  totalPrice: number;
  amountPaid: number;
  balance: number;
};

type NewServiceParams = CommonParams & { serviceDate: string };
type ReadyParams = CommonParams;

const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
const graphVersion = (process.env.META_GRAPH_API_VERSION?.trim() || "v22.0").replace(/^\/?/, "");

export const whatsappConfigured = Boolean(accessToken && phoneNumberId);

function normalizePhone(phone: string): string | null {
  const compact = phone.trim().replace(/[\s().-]/g, "");
  if (!compact || !/^\+?\d+$/.test(compact)) return null;
  if (compact.startsWith("00")) return compact.slice(2);
  if (compact.startsWith("+")) return compact.slice(1);
  if (/^0\d{9}$/.test(compact)) return `27${compact.slice(1)}`;
  if (/^27\d{9}$/.test(compact)) return compact;
  return null;
}

function dateLabel(value: string): string {
  if (!value) return "To be confirmed";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }).format(date);
}

function money(value: number): string { return `R${Number(value || 0).toFixed(2)}`; }
function reference(id: string): string { return id.replace(/-/g, "").slice(0, 8).toUpperCase(); }
function clock(value?: string | null): string {
  if (!value) return "Time to be confirmed";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : value;
}

async function sendText(phone: string, body: string): Promise<WhatsAppResult> {
  if (!whatsappConfigured) return { success: false, skipped: true, sid: null, error: "WhatsApp Cloud API is not configured. Add META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID to the server environment." };
  const to = normalizePhone(phone);
  if (!to) return { success: false, skipped: true, sid: null, error: "Customer phone number is invalid. Use a South African mobile number or an international number with country code." };

  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number; error_subcode?: number; type?: string } };
    if (!response.ok) {
      const metaMessage = payload.error?.message || `Meta WhatsApp API returned HTTP ${response.status}.`;
      const policyHint = payload.error?.code === 190
        ? " Meta rejected the access token. In Meta for Developers, generate a fresh access token for the correct app/business and WhatsApp account, ensure it has whatsapp_business_messaging and whatsapp_business_management permissions, then update META_WHATSAPP_ACCESS_TOKEN in local .env.local and the Vercel environment. Redeploy after updating it. Never share the token in logs or chat."
        : payload.error?.code === 131047
          ? " WhatsApp requires an approved message template when the customer-service window has expired; a custom text message cannot be sent outside that window."
          : payload.error?.code === 132000 || payload.error?.code === 132001
            ? " Check that the approved WhatsApp template name, language and parameters match the template configured in WhatsApp Manager."
            : " Check the Meta app, WhatsApp phone-number ID, access token, recipient and WhatsApp Manager setup.";
      console.error("META WHATSAPP SEND FAILED", { status: response.status, code: payload.error?.code, message: metaMessage });
      return { success: false, skipped: false, sid: null, error: `${metaMessage}${policyHint}` };
    }
    const messageId = payload.messages?.[0]?.id ?? null;
    console.info("META WHATSAPP MESSAGE ACCEPTED", { messageId, recipient: to });
    return { success: true, skipped: false, sid: messageId, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected WhatsApp API error.";
    console.error("META WHATSAPP SEND FAILED", message);
    return { success: false, skipped: false, sid: null, error: message };
  }
}

function invoiceLines(p: CommonParams): string[] {
  const fulfillment = p.fulfillmentMethod === "delivery" ? "Delivery" : "Customer collection";
  const itemLine = p.numberOfItems ? `${p.numberOfItems} item${p.numberOfItems === 1 ? "" : "s"}` : "Not specified";
  return [
    `SERVICE: ${p.serviceName || "Laundry Service"}`,
    p.serviceDescription || null,
    `REFERENCE: ${reference(p.serviceId)}`,
    `COLLECTION: ${dateLabel(p.collectionDate)} at ${clock(p.collectionTime)}`,
    `ITEMS: ${itemLine}`,
    `METHOD: ${fulfillment}`,
    `TOTAL: ${money(p.totalPrice)}`,
    `PAID: ${money(p.amountPaid)}`,
    `BALANCE: ${money(p.balance)}`,
  ].filter((line): line is string => Boolean(line));
}

export async function sendNewServiceWhatsApp(p: NewServiceParams): Promise<WhatsAppResult> {
  const body = ["ODANCIA LAUNDRY | SERVICE INVOICE", "", `Hi ${p.customerName}, your laundry service has been booked successfully.`, "", `RECEIVED: ${dateLabel(p.serviceDate)}`, ...invoiceLines(p), "", "Thank you for choosing Odancia Laundry."].join("\n");
  return sendText(p.phone, body);
}

export async function sendReadyForCollectionWhatsApp(p: ReadyParams): Promise<WhatsAppResult> {
  const body = ["ODANCIA LAUNDRY | READY FOR COLLECTION", "", `Hi ${p.customerName}, your laundry is ready.`, "", ...invoiceLines(p), "", p.balance > 0 ? "Please settle the outstanding balance when collecting." : "Your service has been fully paid.", "", "Thank you for choosing Odancia Laundry."].join("\n");
  return sendText(p.phone, body);
}
