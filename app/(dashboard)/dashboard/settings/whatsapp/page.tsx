import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, MessageCircle, ShieldCheck } from "lucide-react";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";

export default async function WhatsAppSettingsPage() {
  await requireOwnerOrAdmin();
  const variables = [
    { key: "META_WHATSAPP_ACCESS_TOKEN", value: process.env.META_WHATSAPP_ACCESS_TOKEN },
    { key: "META_WHATSAPP_PHONE_NUMBER_ID", value: process.env.META_WHATSAPP_PHONE_NUMBER_ID },
    { key: "META_WHATSAPP_INVOICE_TEMPLATE_NAME", value: process.env.META_WHATSAPP_INVOICE_TEMPLATE_NAME },
    { key: "META_WHATSAPP_READY_TEMPLATE_NAME", value: process.env.META_WHATSAPP_READY_TEMPLATE_NAME },
    { key: "META_APP_SECRET", value: process.env.META_APP_SECRET },
    { key: "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN", value: process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN },
  ];
  const configured = variables.filter((item) => Boolean(item.value?.trim())).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Back to settings</Link>
        <header className="mt-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><MessageCircle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Integrations</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">WhatsApp messaging</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Automatic service invoices and ready-for-collection updates through Meta&apos;s official WhatsApp Cloud API.</p>
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-950">Server configuration</h2>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${configured === variables.length ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {configured === variables.length ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
              {configured}/{variables.length} settings detected
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Values are intentionally never shown here. Add them only to your hosting provider&apos;s server-side environment settings and restart/redeploy after changing them.</p>
          <div className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
            {variables.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 px-4 py-3">
                <code className="break-all text-xs text-neutral-700">{item.key}</code>
                <span className={`shrink-0 text-xs font-semibold ${item.value?.trim() ? "text-emerald-700" : "text-amber-700"}`}>{item.value?.trim() ? "Set" : "Missing"}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Keep access tokens secret</div>
            <p className="mt-1 text-xs">Do not prefix credentials with NEXT_PUBLIC_ or commit them to Git. Only server code should access the Meta token and app secret.</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-neutral-950">Templates to create and approve in Meta</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Business-initiated messages use approved templates. The invoice template needs a <strong>document header</strong>, so the branded PDF can be attached.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Invoice PDF</p>
              <code className="mt-2 block text-sm font-bold text-blue-900">odancia_service_invoice</code>
              <p className="mt-2 text-sm font-medium text-neutral-800">Header: Document</p>
              <p className="mt-1 text-xs leading-5 text-neutral-600">Body placeholders in this exact order:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-neutral-600">
                <li>Customer name</li><li>Invoice / service reference</li>
              </ol>
              <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">Suggested body: Hi &#123;&#123;1&#125;&#125;, your Odancia Laundry invoice &#123;&#123;2&#125;&#125; is attached. Thank you for choosing us.</div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Ready for collection</p>
              <code className="mt-2 block text-sm font-bold text-blue-900">odancia_ready_for_collection</code>
              <p className="mt-2 text-xs leading-5 text-neutral-600">Body placeholders in this exact order:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-neutral-600">
                <li>Customer name</li><li>Service reference</li><li>Service type</li><li>Collection date/time</li><li>Outstanding balance</li>
              </ol>
              <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">Suggested body: Hi &#123;&#123;1&#125;&#125;, service &#123;&#123;2&#125;&#125; (&#123;&#123;3&#125;&#125;) is ready for collection. Collection: &#123;&#123;4&#125;&#125;. Outstanding balance: &#123;&#123;5&#125;&#125;. Thank you, Odancia Laundry.</div>
            </div>
          </div>
          <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-800 hover:text-blue-950">Meta WhatsApp Cloud API docs <ExternalLink className="h-4 w-4" /></a>
        </section>

        <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-neutral-950">Webhook callback</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Configure the WhatsApp webhook in your Meta app to receive message delivery status updates. Use your deployed HTTPS origin plus this path:</p>
          <code className="mt-3 block overflow-x-auto rounded-xl bg-neutral-950 px-4 py-3 text-sm text-white">/api/webhooks/whatsapp</code>
          <p className="mt-3 text-xs leading-5 text-neutral-500">Subscribe to the <code>messages</code> field. GET verification uses META_WHATSAPP_WEBHOOK_VERIFY_TOKEN; POST signatures are checked using META_APP_SECRET.</p>
        </section>

        <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-7">
          <h2 className="text-sm font-bold text-amber-950">Customer permission is required</h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">The app stores an explicit WhatsApp opt-in. Existing clients default to not opted in; invoice and ready notifications are skipped until the customer has agreed. Staff should record permission honestly and update it if a customer withdraws it.</p>
        </section>
      </div>
    </main>
  );
}
