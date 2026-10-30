"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, LogIn, LogOut, UserRound } from "lucide-react";
import { updateStaffShift, type ShiftIntent } from "./actions";

type StaffShiftMember = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  role: string;
  shift: { id: string; staff_id: string; checked_in_at: string } | null;
};

type ShiftCardProps = { staffMembers: StaffShiftMember[] };

type FlashMessage = { success: boolean; message: string } | null;

export default function ShiftCard({ staffMembers }: ShiftCardProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [flashByStaff, setFlashByStaff] = useState<Record<string, FlashMessage>>({});

  async function changeShift(staffId: string, intent: ShiftIntent) {
    setPendingId(staffId);
    setFlashByStaff((current) => ({ ...current, [staffId]: null }));
    try {
      const result = await updateStaffShift(staffId, intent);
      setFlashByStaff((current) => ({ ...current, [staffId]: result }));
      if (result.success) router.refresh();
    } catch (error) {
      console.error("STAFF SHIFT ACTION FAILED", error);
      setFlashByStaff((current) => ({ ...current, [staffId]: { success: false, message: "Unable to update attendance. Please try again." } }));
    } finally {
      setPendingId(null);
    }
  }

  const onDutyCount = staffMembers.filter((member) => Boolean(member.shift)).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 className="text-sm font-semibold text-slate-950">Team members</h2><p className="mt-1 text-xs text-slate-500">Clock each person in or out. Shift changes are recorded against the logged-in administrator.</p></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"><span className="h-2 w-2 rounded-full bg-blue-600" />{onDutyCount} currently on duty</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {staffMembers.map((member) => {
          const isOnDuty = Boolean(member.shift);
          const isPending = pendingId === member.id;
          const flash = flashByStaff[member.id];
          return (
            <article key={member.id} className={`rounded-2xl border p-4 transition ${isOnDuty ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isOnDuty ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-500"}`}><UserRound className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-950">{member.full_name}</p><p className="mt-1 truncate text-xs text-slate-500">{member.phone || "No phone recorded"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${isOnDuty ? "bg-blue-100 text-blue-800" : member.is_active ? "bg-slate-100 text-slate-600" : "bg-red-100 text-red-700"}`}>{isOnDuty ? "On duty" : member.is_active ? "Off duty" : "Inactive"}</span>{!member.is_active && <span className="text-[10px] text-red-600">Cannot clock in</span>}</div></div>
              </div>
              {isOnDuty && member.shift && <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-blue-900"><Clock3 className="h-3.5 w-3.5 shrink-0" /> Started {new Date(member.shift.checked_in_at).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit" })}</p>}
              {!isOnDuty && <p className="mt-4 text-[11px] leading-5 text-slate-500">This team member has no open shift.</p>}
              {flash && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-[11px] leading-5 ${flash.success ? "bg-blue-100 text-blue-900" : "bg-red-50 text-red-700"}`}>{flash.message}</p>}
              {isOnDuty ? (
                <button type="button" onClick={() => void changeShift(member.id, "clock_out")} disabled={isPending} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}Clock out</button>
              ) : (
                <button type="button" onClick={() => void changeShift(member.id, "clock_in")} disabled={isPending || !member.is_active} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-3 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}Clock in</button>
              )}
              {isOnDuty && <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-blue-700"><CheckCircle2 className="h-3 w-3" />Passcode authorizations enabled</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
