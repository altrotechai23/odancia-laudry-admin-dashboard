"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateClientAction } from "@/actions/clients/update-client";

export default function ClientEditForm({ client }: { client: { id: string; full_name: string; phone: string; email: string | null } }) {
  const [state, action, pending] = useActionState(updateClientAction, { success: false, message: "" });
  const input = "mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
  return <form action={action} className="mt-6 max-w-2xl space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7">
    <input type="hidden" name="id" value={client.id} />
    {state.message && !state.success && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</p>}
    <label className="block text-sm font-medium text-neutral-700">Full name<input className={input} name="full_name" defaultValue={client.full_name} required minLength={2} /></label>
    <label className="block text-sm font-medium text-neutral-700">Phone number<input className={input} name="phone" type="tel" defaultValue={client.phone} required /></label>
    <label className="block text-sm font-medium text-neutral-700">Email (optional)<input className={input} name="email" type="email" defaultValue={client.email ?? ""} /></label>
    <div className="flex flex-wrap gap-3 pt-2"><button disabled={pending} className="h-11 rounded-xl bg-blue-800 px-5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{pending ? "Saving…" : "Save changes"}</button><Link href={`/dashboard/clients/${client.id}`} className="inline-flex h-11 items-center rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700">Cancel</Link></div>
  </form>;
}
