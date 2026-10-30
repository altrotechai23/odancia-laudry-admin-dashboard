"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Truck } from "lucide-react";
import { updateServiceStatus } from "@/actions/services/update-service-status";

type ServiceStatus = "pending" | "ready_for_collection" | "collected";
type ActionState = { success: boolean; message: string };
const initialState: ActionState = { success: false, message: "" };

type ServiceActionsProps = { serviceId: string; status: ServiceStatus };

export default function ServiceActions({ serviceId, status }: ServiceActionsProps) {
  const [confirmingCollection, setConfirmingCollection] = useState(false);
  const [passcodeTarget, setPasscodeTarget] = useState<ServiceStatus | null>(null);
  const [passcode, setPasscode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);

  const [state, action, isPending] = useActionState(
    async (_previousState: ActionState, formData: FormData) => {
      const nextStatus = String(formData.get("status")) as ServiceStatus;
      const code = String(formData.get("staff_passcode") ?? "");
      const result = await updateServiceStatus(serviceId, nextStatus, code);
      setPasscode("");
      if (passcodeRef.current) passcodeRef.current.value = "";
      if (result.success) {
        setConfirmingCollection(false);
        setPasscodeTarget(null);
      }
      return result;
    },
    initialState,
  );


  function beginStatusUpdate(nextStatus: ServiceStatus) {
    setPasscode("");
    setPasscodeTarget(nextStatus);
  }

  function submitStatus() {
    if (!passcodeTarget || !/^\d{4}$/.test(passcode) || !formRef.current || !passcodeRef.current) return;
    const statusInput = formRef.current.querySelector('input[name="status"]') as HTMLInputElement | null;
    if (!statusInput) return;
    statusInput.value = passcodeTarget;
    passcodeRef.current.value = passcode;
    formRef.current.requestSubmit();
  }

  return (
    <div className="space-y-4">
      {state.message && <div role="status" className={`rounded-xl px-3 py-2 text-xs ${state.success ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-700"}`}>{state.message}</div>}

      {status === "pending" && <button type="button" disabled={isPending} onClick={() => beginStatusUpdate("ready_for_collection")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{isPending ? "Updating…" : "Mark ready for collection"}</button>}
      {status === "ready_for_collection" && <button type="button" disabled={isPending} onClick={() => setConfirmingCollection(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:opacity-50"><Truck className="h-4 w-4" /> Mark as collected</button>}
      {status === "collected" && <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800"><CheckCircle2 className="h-4 w-4" /> Service completed</div>}

      <form ref={formRef} action={action} className="hidden"><input type="hidden" name="status" defaultValue={status} /><input ref={passcodeRef} type="hidden" name="staff_passcode" defaultValue="" /></form>

      {confirmingCollection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="collection-confirmation-title" className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><CheckCircle2 className="h-5 w-5" /></div><h3 id="collection-confirmation-title" className="mt-5 text-base font-semibold text-slate-950">Mark service as collected?</h3><p className="mt-2 text-sm leading-6 text-slate-500">This marks the laundry service as completed. An admin code (0000) or an on-duty staff passcode is required to confirm the change.</p><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" disabled={isPending} onClick={() => setConfirmingCollection(false)} className="h-11 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" disabled={isPending} onClick={() => { setConfirmingCollection(false); beginStatusUpdate("collected"); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Continue</button></div></div></div>}

      {passcodeTarget && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="status-passcode-title" className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><ShieldCheck className="h-5 w-5" /></div><h3 id="status-passcode-title" className="mt-4 text-base font-semibold text-slate-950">Confirm service change</h3><p className="mt-2 text-xs leading-5 text-slate-500">Enter 0000 to act as the currently logged-in admin, or enter the code of an active staff member who is currently on duty. Reading service details does not require a code.</p><input autoFocus type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} value={passcode} onChange={(event) => setPasscode(event.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitStatus(); } }} placeholder="Admin 0000 or staff code" className="mt-4 h-12 w-full rounded-xl border border-slate-200 text-center text-lg tracking-[0.5em] text-slate-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={isPending} onClick={() => { setPasscodeTarget(null); setPasscode(""); }} className="min-h-11 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={isPending || !/^\d{4}$/.test(passcode)} onClick={submitStatus} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-3 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50">{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Verify & update</button></div></div></div>}
    </div>
  );
}
