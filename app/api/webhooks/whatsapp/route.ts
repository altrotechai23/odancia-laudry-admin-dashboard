import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};
type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { statuses?: MetaStatus[] };
    }>;
  }>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Webhook verification failed.", { status: 403 });
}

export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET?.trim();
  if (!appSecret) return new Response("Meta webhook signature validation is not configured.", { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  if (!signature.startsWith("sha256=")) return new Response("Missing webhook signature.", { status: 401 });

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  if (expectedBytes.length !== receivedBytes.length || !timingSafeEqual(expectedBytes, receivedBytes)) {
    return new Response("Invalid webhook signature.", { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    return new Response("Invalid JSON payload.", { status: 400 });
  }

  try {
    const admin = createAdminClient();
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        for (const status of change.value?.statuses ?? []) {
          if (!status.id || !["sent", "delivered", "read", "failed"].includes(String(status.status))) continue;
          const nextStatus = status.status as "sent" | "delivered" | "read" | "failed";
          const { data: log } = await admin
            .from("whatsapp_message_logs")
            .select("id,status")
            .eq("meta_message_id", status.id)
            .maybeSingle();
          if (!log) continue; // Ignore messages not sent by this application.

          const rank: Record<string, number> = { queued: 0, skipped: -1, sent: 1, failed: 2, delivered: 3, read: 4 };
          if ((rank[nextStatus] ?? 0) < (rank[log.status] ?? 0)) continue; // Avoid stale webhook events moving status backwards.
          const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
          const firstError = status.errors?.[0];
          const patch: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
          if (nextStatus === "delivered") patch.delivered_at = timestamp;
          if (nextStatus === "read") {
            patch.delivered_at = timestamp;
            patch.read_at = timestamp;
          }
          if (nextStatus === "failed") {
            patch.error_code = firstError?.code == null ? null : String(firstError.code);
            patch.error_message = (firstError?.title || firstError?.message || firstError?.error_data?.details || "WhatsApp message delivery failed.").slice(0, 1000);
          }
          const { error } = await admin.from("whatsapp_message_logs").update(patch).eq("id", log.id);
          if (error) console.error("WHATSAPP WEBHOOK STATUS UPDATE FAILED:", error.message);
        }
      }
    }
  } catch (error) {
    console.error("WHATSAPP WEBHOOK HANDLER FAILED:", error instanceof Error ? error.message : "unknown error");
    return new Response("Webhook processing failed.", { status: 500 });
  }

  return Response.json({ received: true });
}
