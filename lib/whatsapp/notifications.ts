import "server-only";

import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServiceInvoicePdf, type InvoicePdfInput } from "@/lib/whatsapp/invoice-pdf";
import { isWhatsAppConfigured, sendWhatsAppTemplate, uploadWhatsAppPdf } from "@/lib/whatsapp/cloud-api";

export type WhatsAppNotificationResult = {
  success: boolean;
  status: "sent" | "failed" | "skipped";
  message: string;
  metaMessageId?: string;
};

type LogInput = {
  serviceId: string;
  clientId: string | null;
  actorId: string | null;
  recipientPhone: string;
  messageType: "service_invoice" | "service_ready";
  templateName: string | null;
  status: "sent" | "failed" | "skipped";
  metaMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

async function writeMessageLog(input: LogInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("whatsapp_message_logs").insert({
      service_id: input.serviceId,
      client_id: input.clientId || null,
      created_by: input.actorId,
      recipient_phone: input.recipientPhone,
      message_type: input.messageType,
      template_name: input.templateName,
      status: input.status,
      meta_message_id: input.metaMessageId ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage?.slice(0, 1000) ?? null,
      metadata: input.metadata ?? {},
      sent_at: input.status === "sent" ? new Date().toISOString() : null,
    });
    if (error) console.error("WHATSAPP MESSAGE LOG INSERT FAILED:", error.message);
  } catch (error) {
    console.error("WHATSAPP MESSAGE LOGGING UNAVAILABLE:", error instanceof Error ? error.message : "unknown error");
  }
}

function skipped(input: Omit<LogInput, "status" | "errorMessage">, message: string): Promise<WhatsAppNotificationResult> {
  return writeMessageLog({ ...input, status: "skipped", errorMessage: message }).then(() => ({ success: false, status: "skipped", message }));
}

function failed(input: Omit<LogInput, "status">, message: string, errorCode?: string | number): Promise<WhatsAppNotificationResult> {
  return writeMessageLog({ ...input, status: "failed", errorMessage: message, errorCode: errorCode == null ? null : String(errorCode) }).then(() => ({ success: false, status: "failed", message }));
}

function normalizeRecipient(phone: string): string | null {
  const value = phone.trim();
  if (!value) return null;
  // Legacy South African national-format numbers are interpreted as ZA, while
  // existing international/E.164 numbers retain their chosen country prefix.
  const parsed = parsePhoneNumberFromString(value, "ZA");
  return parsed?.isValid() ? parsed.number : null;
}

function reference(input: { serviceNumber?: string | null; serviceId: string }): string {
  return input.serviceNumber?.trim() || input.serviceId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function errorDetails(error: unknown): { message: string; code?: string | number } {
  if (error instanceof Error) {
    const metaError = error as Error & { code?: number };
    return { message: error.message, code: metaError.code };
  }
  return { message: "Meta WhatsApp Cloud API request failed." };
}

export async function sendServiceInvoiceWhatsApp(input: {
  optedIn: boolean;
  clientId: string;
  serviceId: string;
  serviceNumber?: string | null;
  actorId: string | null;
  phone: string;
  invoice: Omit<InvoicePdfInput, "invoiceNumber" | "customerPhone">;
}): Promise<WhatsAppNotificationResult> {
  const templateName = process.env.META_WHATSAPP_INVOICE_TEMPLATE_NAME?.trim() || "";
  const baseLog = {
    serviceId: input.serviceId,
    clientId: input.clientId,
    actorId: input.actorId,
    recipientPhone: input.phone,
    messageType: "service_invoice" as const,
    templateName: templateName || null,
    metadata: { invoice_number: reference({ serviceId: input.serviceId, serviceNumber: input.serviceNumber }) },
  };

  if (!input.optedIn) return skipped(baseLog, "WhatsApp was not sent because customer consent has not been recorded.");
  const phone = normalizeRecipient(input.phone);
  if (!phone) return failed(baseLog, "Customer phone number must be a valid international number (E.164) before WhatsApp can be sent.");
  if (!isWhatsAppConfigured()) return skipped(baseLog, "WhatsApp Cloud API is not configured. Add the server-side Meta access token and phone-number ID.");
  if (!templateName) return skipped(baseLog, "The approved invoice template is not configured. Set META_WHATSAPP_INVOICE_TEMPLATE_NAME after creating and approving the document-header template in Meta.");

  const invoiceNumber = reference({ serviceId: input.serviceId, serviceNumber: input.serviceNumber });
  const filename = `Odancia-Invoice-${invoiceNumber.replace(/[^A-Za-z0-9_-]/g, "-")}.pdf`;

  try {
    const pdf = await createServiceInvoicePdf({
      ...input.invoice,
      invoiceNumber,
      customerPhone: phone,
    });
    const mediaId = await uploadWhatsAppPdf(pdf, filename);
    const response = await sendWhatsAppTemplate({
      toE164: phone,
      templateName,
      components: [
        { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename } }] },
        { type: "body", parameters: [
          { type: "text", text: input.invoice.customerName.slice(0, 200) },
          { type: "text", text: invoiceNumber.slice(0, 128) },
        ] },
      ],
    });
    await writeMessageLog({
      ...baseLog,
      recipientPhone: phone,
      status: "sent",
      metaMessageId: response.messageId,
      metadata: { ...baseLog.metadata, invoice_file_name: filename, meta_media_id: mediaId },
    });
    return { success: true, status: "sent", message: "Invoice sent through WhatsApp.", metaMessageId: response.messageId };
  } catch (error) {
    const details = errorDetails(error);
    console.error("WHATSAPP SERVICE INVOICE FAILED:", details.message);
    return failed({ ...baseLog, recipientPhone: phone }, details.message, details.code);
  }
}

export async function sendServiceReadyWhatsApp(input: {
  optedIn: boolean;
  clientId: string;
  serviceId: string;
  serviceNumber?: string | null;
  actorId: string | null;
  phone: string;
  customerName: string;
  serviceName: string;
  collectionDate?: string | null;
  collectionTime?: string | null;
  outstandingBalance: number;
}): Promise<WhatsAppNotificationResult> {
  const templateName = process.env.META_WHATSAPP_READY_TEMPLATE_NAME?.trim() || "";
  const baseLog = {
    serviceId: input.serviceId,
    clientId: input.clientId,
    actorId: input.actorId,
    recipientPhone: input.phone,
    messageType: "service_ready" as const,
    templateName: templateName || null,
    metadata: { service_number: reference({ serviceId: input.serviceId, serviceNumber: input.serviceNumber }) },
  };

  if (!input.optedIn) return skipped(baseLog, "WhatsApp was not sent because customer consent has not been recorded.");
  const phone = normalizeRecipient(input.phone);
  if (!phone) return failed(baseLog, "Customer phone number must be a valid international number (E.164) before WhatsApp can be sent.");
  if (!isWhatsAppConfigured()) return skipped(baseLog, "WhatsApp Cloud API is not configured. Add the server-side Meta access token and phone-number ID.");
  if (!templateName) return skipped(baseLog, "The approved ready-for-collection template is not configured. Set META_WHATSAPP_READY_TEMPLATE_NAME after creating and approving it in Meta.");

  const collection = input.collectionDate
    ? `${input.collectionDate}${input.collectionTime ? ` at ${input.collectionTime.slice(0, 5)}` : ""}`
    : "as arranged with our team";
  const balance = `R ${Number(input.outstandingBalance || 0).toFixed(2)}`;

  try {
    const response = await sendWhatsAppTemplate({
      toE164: phone,
      templateName,
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: input.customerName.slice(0, 200) },
          { type: "text", text: reference({ serviceId: input.serviceId, serviceNumber: input.serviceNumber }).slice(0, 128) },
          { type: "text", text: input.serviceName.slice(0, 200) },
          { type: "text", text: collection.slice(0, 200) },
          { type: "text", text: balance },
        ],
      }],
    });
    await writeMessageLog({ ...baseLog, recipientPhone: phone, status: "sent", metaMessageId: response.messageId });
    return { success: true, status: "sent", message: "Ready-for-collection WhatsApp message sent.", metaMessageId: response.messageId };
  } catch (error) {
    const details = errorDetails(error);
    console.error("WHATSAPP READY NOTIFICATION FAILED:", details.message);
    return failed({ ...baseLog, recipientPhone: phone }, details.message, details.code);
  }
}
