import Link from "next/link";
import { ArrowLeft, BellRing, CheckCircle2, ShieldAlert, MessageCircle } from "lucide-react";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { whatsappConfigured } from "@/lib/notifications/whatsapp";

export default async function NotificationsSettingsPage() {
  await requireOwnerOrAdmin();
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 transition hover:text-neutral-950"><ArrowLeft className="h-3.5 w-3.5" /> Back to settings</Link>
        <header className="mt-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white"><BellRing className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">Settings / Notifications</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">WhatsApp notifications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Send a custom service invoice message when a service is created, and a ready-for-collection message when its status changes.</p></div>
        </header>
        <section className="mt-7 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)] sm:p-6">
          <div className="flex items-start gap-3">
            {whatsappConfigured ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
            <div><h2 className="text-sm font-semibold text-neutral-950">Meta WhatsApp Cloud API</h2><p className="mt-1 text-sm leading-6 text-neutral-600">{whatsappConfigured ? "The access token and WhatsApp phone-number ID are present on the server. This confirms configuration only, not message delivery." : "WhatsApp is not fully configured. Add META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID to your deployment environment, then redeploy."}</p><p className="mt-2 text-xs text-neutral-400">Access tokens remain server-side and are never shown in the dashboard.</p></div>
          </div>
        </section>
        <section className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-emerald-950"><MessageCircle className="h-5 w-5" /><h2 className="text-sm font-semibold">Important WhatsApp delivery rule</h2></div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-emerald-950/80">
            <li>Use a permanent/system-user access token and the Phone Number ID from WhatsApp Manager, not the display phone number.</li>
            <li>Customers should have agreed to receive WhatsApp messages from Odancia Laundry.</li>
            <li>Meta allows free-form text replies during the customer-service window (normally 24 hours after the customer messages the business). Outside that window, Meta requires an approved WhatsApp message template; an arbitrary custom invoice text can be rejected.</li>
            <li>A successful API response means Meta accepted the message request, not that the recipient has received or read it.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
