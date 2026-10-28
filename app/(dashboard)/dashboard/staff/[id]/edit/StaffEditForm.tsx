"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";

import { updateStaff } from "./actions";
import { initialUpdateStaffState, type StaffProfile, type UpdateStaffRole } from "./types";

type StaffEditFormProps = { profile: StaffProfile; currentRole: UpdateStaffRole };

export default function StaffEditForm({ profile, currentRole }: StaffEditFormProps) {
  const boundAction = updateStaff.bind(null, profile.id);
  const [state, formAction, pending] = useActionState(boundAction, initialUpdateStaffState);
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [email, setEmail] = useState(profile.contact_email ?? "");
  const [passcode, setPasscode] = useState("");
  const [isActive, setIsActive] = useState(profile.is_active);

  useEffect(() => {
    if (state.message) setPasscode("");
  }, [state.message]);

  return (
    <form action={formAction} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 text-white"><UserRound className="h-4 w-4" /></div>
        <div><h2 className="text-sm font-semibold text-slate-950">Team member details</h2><p className="mt-1 text-[11px] text-slate-500">Maintain contact details and the service authorization code.</p></div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {state.message && <div role={state.success ? "status" : "alert"} className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-xs ${state.success ? "border border-blue-100 bg-blue-50 text-blue-800" : "border border-red-200 bg-red-50 text-red-700"}`}>{state.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<p className="leading-5">{state.message}</p></div>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" id="full_name" icon={<UserRound className="h-4 w-4" />}><input id="full_name" name="full_name" required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={pending} className={inputClass} /></Field>
          <Field label="Phone number" id="phone" icon={<Phone className="h-4 w-4" />}><input id="phone" name="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={pending} placeholder="+27 …" className={inputClass} /></Field>
          <Field label="Physical address" id="address" icon={<MapPin className="h-4 w-4" />}><input id="address" name="address" value={address} onChange={(event) => setAddress(event.target.value)} disabled={pending} maxLength={300} placeholder="Street, suburb, city" className={inputClass} /></Field>
          <Field label="Contact email (optional)" id="contact_email" icon={<Mail className="h-4 w-4" />}><input id="contact_email" name="contact_email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={pending} placeholder="staff@example.com" className={inputClass} /></Field>
        </div>

        {profile.role === "staff" && <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-800"><ShieldCheck className="h-4 w-4" /></div><div><h3 className="text-xs font-semibold text-blue-950">4-digit service passcode</h3><p className="mt-1 text-[11px] leading-5 text-blue-900/75">This code does not log the staff member into the app. It identifies the operator for service changes and payments; the member must be active and clocked in. 0000 is reserved for admins. Leave blank to keep the existing code.</p></div></div>
          <input id="new_passcode" name="new_passcode" type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} value={passcode} onChange={(event) => setPasscode(event.target.value.replace(/\D/g, "").slice(0, 4))} disabled={pending} placeholder="New four-digit code (optional)" className={`${inputClass} mt-4 max-w-sm tracking-[0.35em]`} />
        </section>}

        <section className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
          <div><h3 className="text-xs font-semibold text-slate-900">Staff status</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Inactive staff cannot authorize service changes or clock in. Existing open shifts can still be closed by an administrator.</p></div>
          <label className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="is_active" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={pending} className="h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-600" /> Active</label>
        </section>
        <p className="text-[11px] leading-5 text-slate-400">Editing as {currentRole}. Account type remains {profile.role}.</p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Link href="/dashboard/staff" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Back to staff</Link>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes</button>
      </div>
    </form>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60";

function Field({ label, id, icon, children }: { label: string; id: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><span className="text-slate-400">{icon}</span>{label}</label>{children}</div>;
}
