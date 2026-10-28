"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone, Save, ShieldCheck, UserRound } from "lucide-react";

import { createStaffAction, type CreateStaffState } from "./actions";

const initialState: CreateStaffState = { success: false, message: "" };

type StaffCreateFormProps = { currentRole: "staff" | "owner" | "admin" };

export default function StaffCreateForm({ currentRole }: StaffCreateFormProps) {
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);

  if (state.success) {
    return (
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50/70 px-5 py-5 sm:px-7">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div><h2 className="text-sm font-semibold text-blue-950">Staff member added</h2><p className="mt-1 text-xs leading-5 text-blue-800">{state.message}</p></div>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:p-7">
          <Link href="/dashboard/staff" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-800 px-5 text-xs font-semibold text-white hover:bg-blue-900">Back to staff</Link>
          <Link href="/dashboard/shift" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage attendance</Link>
          <Link href="/dashboard/staff/new" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-100 px-5 text-xs font-semibold text-red-700 hover:bg-red-50">Add another staff member</Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
        {state.message && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{state.message}</div>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" name="full_name" placeholder="e.g. John Smith" icon={<UserRound className="h-3.5 w-3.5" />} required autoComplete="name" />
          <Field label="Phone number" name="phone" type="tel" placeholder="e.g. +27 74 123 4567" icon={<Phone className="h-3.5 w-3.5" />} required autoComplete="tel" />
          <Field label="Physical address" name="address" placeholder="Street, suburb, city" icon={<MapPin className="h-3.5 w-3.5" />} required autoComplete="street-address" />
          <Field label="Contact email" name="email" type="email" placeholder="Optional contact email" icon={<Mail className="h-3.5 w-3.5" />} autoComplete="email" />
          <Field label="4-digit service passcode" name="passcode" type="password" placeholder="Choose four digits" icon={<ShieldCheck className="h-3.5 w-3.5" />} required autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} />
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-4">
          <p className="text-xs font-semibold text-blue-950">How staff access works</p>
          <p className="mt-1 text-[11px] leading-5 text-blue-900/75">Staff do not log in. An administrator records their shift start and finish. Their unique 4-digit code (not 0000, which is reserved for admins) is requested for service changes and payments only while they are on duty; viewing service data does not require a code.</p>
          <p className="mt-2 text-[11px] text-slate-500">Created by {currentRole}.</p>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
        <Link href="/dashboard/staff" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-xs font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding staff…</> : <><Save className="h-3.5 w-3.5" /> Add staff member</>}</button>
      </div>
    </form>
  );
}

function Field({ label, name, placeholder, type = "text", icon, required = false, autoComplete, inputMode, pattern, minLength, maxLength }: {
  label: string; name: string; placeholder: string; type?: string; icon: React.ReactNode; required?: boolean;
  autoComplete?: string; inputMode?: "text" | "numeric" | "tel" | "email"; pattern?: string; minLength?: number; maxLength?: number;
}) {
  return <div className="space-y-2"><label htmlFor={name} className="block text-xs font-semibold text-slate-800">{label}{required && <span className="ml-1 text-red-600">*</span>}</label><div className="relative"><div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400">{icon}</div><input id={name} name={name} type={type} required={required} autoComplete={autoComplete} inputMode={inputMode} pattern={pattern} minLength={minLength} maxLength={maxLength} placeholder={placeholder} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div></div>;
}
