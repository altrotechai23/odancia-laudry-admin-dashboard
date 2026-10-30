import Link from "next/link";
import { ArrowLeft, FileJson, ShieldCheck } from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import BookServiceImport from "./BookServiceImport";

export default async function ImportServicesPage() {
  const actor = await requireOwnerOrAdmin();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/services" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-slate-600 transition hover:text-blue-900">
          <ArrowLeft className="h-4 w-4" /> Back to services
        </Link>

        <header className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-blue-800" />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-8">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800 ring-1 ring-blue-100">
              <FileJson className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">Admin tools</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-blue-950 sm:text-3xl">Import services from the book</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload a JSON array of historical service records to create services and customers in Odancia. Existing records are protected by an import key, so re-importing the same file skips already imported records.</p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
              <ShieldCheck className="h-4 w-4" /> Admin only · {actor.full_name}
            </div>
          </div>
        </header>

        <BookServiceImport />

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold text-slate-900">Supported JSON fields</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">The importer accepts common book/export field names. The minimum is a customer name and a total price. Dates are interpreted as YYYY-MM-DD or South African DD/MM/YYYY. <a href="/book-services-example.json" download className="font-semibold text-blue-800 underline decoration-red-400 underline-offset-4">Download example JSON</a>.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Customer</p>
              <code className="mt-2 block whitespace-normal text-xs leading-6 text-slate-700">client_name, client.name, phone, email</code>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Service</p>
              <code className="mt-2 block whitespace-normal text-xs leading-6 text-slate-700">service_number, service_type, total_price, base_price, is_express, service_status, notes</code>
            </div>
            <div className="rounded-xl bg-red-50/70 p-4 ring-1 ring-red-100">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">Important collection schedule</p>
              <code className="mt-2 block whitespace-normal text-xs leading-6 text-slate-700">collection_date, collection_time</code>
              <p className="mt-2 text-xs leading-5 text-slate-500">Both fields are imported when present and highlighted in the Services list.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Payments</p>
              <code className="mt-2 block whitespace-normal text-xs leading-6 text-slate-700">payments: [{"{"}amount, payment_method, payment_stage, reference, notes{"}"}]</code>
              <p className="mt-2 text-xs leading-5 text-slate-500">If no payment array exists, amount_paid or deposit can create a historic payment transaction.</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Each imported payment is attributed to the currently signed-in admin because the book importer is an admin operation. Rows without a collection time remain blank rather than inventing a time.</p>
        </section>
      </div>
    </main>
  );
}
