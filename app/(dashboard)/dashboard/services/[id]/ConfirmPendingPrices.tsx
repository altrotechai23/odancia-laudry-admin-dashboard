"use client";
import { useActionState, useState } from "react";
import { confirmServiceItemPrices } from "@/actions/services/confirm-service-item-prices";
type Item = { id: string; service_name: string; quantity: number };
export default function ConfirmPendingPrices({ serviceId, items }: { serviceId: string; items: Item[] }) {
  const [state, action, pending] = useActionState(confirmServiceItemPrices, { success: false, message: "" });
  const [passcode, setPasscode] = useState("");
  return <form action={action} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
    <input type="hidden" name="serviceId" value={serviceId} />
    <h3 className="font-semibold text-amber-950">Confirm pending prices</h3>
    <p className="mt-1 text-xs text-amber-800">Enter the agreed price for each item. The invoice total and balance will update automatically.</p>
    <div className="mt-3 space-y-3">{items.map((item) => <label key={item.id} className="block text-xs font-medium text-amber-950">{item.service_name} × {item.quantity}<span className="mt-1 flex h-10 items-center rounded-lg border border-amber-200 bg-white px-3"><span className="mr-2 text-neutral-500">R</span><input name={`price_${item.id}`} type="number" min="0" step="0.01" required className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Agreed price" /></span></label>)}</div>
    <label className="mt-3 block text-xs font-medium text-amber-950">Staff / admin authorisation code<input name="staff_passcode" type="password" inputMode="numeric" maxLength={4} value={passcode} onChange={(e) => setPasscode(e.target.value.replace(/\D/g, "").slice(0, 4))} className="mt-1 h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm" placeholder="4-digit code" required /></label>
    {state.message && <p role="status" className={`mt-3 text-xs ${state.success ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>}
    <button disabled={pending || passcode.length !== 4} className="mt-4 h-10 rounded-xl bg-amber-900 px-4 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving prices…" : "Confirm prices"}</button>
  </form>;
}
