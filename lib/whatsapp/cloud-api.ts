import "server-only";

export type WhatsAppApiConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
};

type MetaErrorPayload = {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
};

function readConfig(): WhatsAppApiConfig | null {
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim();
  const graphApiVersion = (process.env.META_WHATSAPP_GRAPH_API_VERSION || "v26.0").trim();

  if (!accessToken || !phoneNumberId || !/^v\d+\.\d+$/.test(graphApiVersion)) return null;
  return { accessToken, phoneNumberId, graphApiVersion };
}

export function isWhatsAppConfigured(): boolean {
  return readConfig() !== null;
}

function endpoint(config: WhatsAppApiConfig, path: string): string {
  return `https://graph.facebook.com/${config.graphApiVersion}/${path}`;
}

async function readMetaResponse(response: Response): Promise<Record<string, unknown>> {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown> & MetaErrorPayload;
  if (!response.ok) {
    const message = body.error?.message || `Meta WhatsApp API returned HTTP ${response.status}.`;
    const error = new Error(message) as Error & { code?: number; payload?: Record<string, unknown> };
    error.code = body.error?.code;
    // Do not attach or log the access token or request headers.
    error.payload = body;
    throw error;
  }
  return body;
}

export async function uploadWhatsAppPdf(
  pdf: Buffer,
  filename: string,
): Promise<string> {
  const config = readConfig();
  if (!config) throw new Error("WhatsApp Cloud API is not configured. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID on the server.");

  const form = new FormData();
  form.set("messaging_product", "whatsapp");
  form.set("type", "application/pdf");
  form.set("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);

  const response = await fetch(endpoint(config, `${config.phoneNumberId}/media`), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const body = await readMetaResponse(response);
  if (typeof body.id !== "string" || !body.id) throw new Error("Meta accepted the media upload but did not return a media ID.");
  return body.id;
}

export type TemplateParameter =
  | { type: "text"; text: string }
  | { type: "document"; document: { id: string; filename: string } };

export async function sendWhatsAppTemplate(input: {
  toE164: string;
  templateName: string;
  language?: string;
  components: Array<{ type: "header" | "body"; parameters: TemplateParameter[] }>;
}): Promise<{ messageId: string }> {
  const config = readConfig();
  if (!config) throw new Error("WhatsApp Cloud API is not configured. Set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID on the server.");
  if (!/^\+[1-9]\d{7,14}$/.test(input.toE164)) throw new Error("The customer phone number is not in valid E.164 international format.");
  if (!/^[a-z0-9_]{2,512}$/.test(input.templateName)) throw new Error("WhatsApp template name is missing or invalid.");

  const response = await fetch(endpoint(config, `${config.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.toE164.slice(1),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language || process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "en_US" },
        components: input.components,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const body = await readMetaResponse(response);
  const messages = body.messages;
  const messageId = Array.isArray(messages) && typeof messages[0]?.id === "string" ? messages[0].id : null;
  if (!messageId) throw new Error("Meta accepted the template request but did not return a message ID.");
  return { messageId };
}
