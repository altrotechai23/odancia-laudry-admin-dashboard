"use client";

import { useActionState, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, PencilLine, X } from "lucide-react";
import {
  updateServiceCollectionSchedule,
  type UpdateCollectionScheduleState,
} from "@/actions/services/update-service-collection";

type CollectionScheduleEditorProps = {
  serviceId: string;
  collectionDate: string | null;
  collectionTime: string | null;
};

const initialState: UpdateCollectionScheduleState = { success: false, message: "" };

export default function CollectionScheduleEditor({
  serviceId,
  collectionDate,
  collectionTime,
}: CollectionScheduleEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(collectionDate ?? "");
  const [time, setTime] = useState(collectionTime?.slice(0, 5) ?? "");
  const [passcode, setPasscode] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const serverAction = updateServiceCollectionSchedule.bind(null, serviceId);

  const [state, action, isPending] = useActionState(
    async (previousState: UpdateCollectionScheduleState, formData: FormData) => {
      const result = await serverAction(previousState, formData);
      setShowMessage(true);
      if (result.success) {
        setIsOpen(false);
        window.location.reload();
      } else {
        setPasscode("");
      }
      return result;
    },
    initialState,
  );


  function openEditor() {
    setDate(collectionDate ?? "");
    setTime(collectionTime?.slice(0, 5) ?? "");
    setPasscode("");
    setShowMessage(false);
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
      >
        {collectionDate && collectionTime ? <PencilLine className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
        {collectionDate && collectionTime ? "Edit collection schedule" : "Set collection date and time"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="collection-schedule-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700"><CalendarClock className="h-5 w-5" /></div>
              <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} aria-label="Close schedule editor" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>
            <h3 id="collection-schedule-title" className="mt-4 text-lg font-bold text-blue-950">Collection schedule</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">Set the promised collection date and time. This is saved to the service and shown at the top of the operational priority list when due.</p>

            <form action={action} className="mt-5 space-y-4">
              <div>
                <label htmlFor={`collection-date-${serviceId}`} className="block text-xs font-bold uppercase tracking-wide text-blue-900">Collection date</label>
                <input id={`collection-date-${serviceId}`} name="collection_date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setShowMessage(false); }} required disabled={isPending} className="mt-2 h-12 w-full rounded-xl border border-blue-100 bg-white px-3 text-base font-semibold text-blue-950 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-50" />
              </div>
              <div>
                <label htmlFor={`collection-time-${serviceId}`} className="block text-xs font-bold uppercase tracking-wide text-red-700">Collection time</label>
                <input id={`collection-time-${serviceId}`} name="collection_time" type="time" value={time} onChange={(event) => { setTime(event.target.value); setShowMessage(false); }} required disabled={isPending} className="mt-2 h-12 w-full rounded-xl border border-red-100 bg-white px-3 text-base font-semibold text-red-800 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 disabled:opacity-50" />
                <p className="mt-1.5 text-xs text-red-700">Please record the actual time promised to the customer; do not leave it blank.</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <label htmlFor={`collection-code-${serviceId}`} className="block text-xs font-bold uppercase tracking-wide text-blue-900">Admin code (0000) or on-duty staff code</label>
                <input id={`collection-code-${serviceId}`} name="staff_passcode" type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} value={passcode} onChange={(event) => { setPasscode(event.target.value.replace(/\D/g, "").slice(0, 4)); setShowMessage(false); }} required disabled={isPending} placeholder="Enter four digits" className="mt-2 h-12 w-full rounded-xl border border-blue-100 bg-white px-3 text-center text-lg tracking-[0.5em] text-blue-950 outline-none focus:border-blue-500 disabled:opacity-50" />
                <p className="mt-2 text-xs leading-5 text-blue-900/70">Use 0000 as the currently logged-in admin, or a unique code for a staff member who is on duty.</p>
              </div>
              {showMessage && state.message && <p role="status" className={`rounded-xl px-3 py-2 text-sm ${state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.message}</p>}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" disabled={isPending} onClick={() => setIsOpen(false)} className="min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isPending || !date || !time || !/^\d{4}$/.test(passcode)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-800 px-3 text-sm font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : state.success ? <CheckCircle2 className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}{isPending ? "Saving…" : "Save schedule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
