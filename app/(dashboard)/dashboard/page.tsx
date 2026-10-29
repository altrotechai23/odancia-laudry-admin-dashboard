import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, Users, UserRound } from "lucide-react";

import { requireUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

type OpenShift = {
  id: string;
  staff_id: string;
  checked_in_at: string;
};

type StaffProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
};

export default async function DashboardPage() {
  const profile = await requireUser();
  if (profile.role === "staff") redirect("/dashboard/services");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">Business workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Overview</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Welcome back, {profile.full_name}. Here is your current staff attendance.</p>
          </div>
          <Link href="/dashboard/shift" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-900 active:translate-y-0"><Clock3 className="h-4 w-4" /> Manage attendance <ArrowRight className="h-3.5 w-3.5" /></Link>
        </header>

        <Suspense fallback={<OnDutySectionSkeleton />}>
          <OnDutyStaffSection />
        </Suspense>
      </div>
    </main>
  );
}

async function OnDutyStaffSection() {
  const admin = createAdminClient();
  const { data: shifts, error: shiftsError } = await admin
    .from("staff_shifts")
    .select("id, staff_id, checked_in_at")
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: true });

  const openShifts = (shifts ?? []) as OpenShift[];
  const staffIds = Array.from(new Set(openShifts.map((shift) => shift.staff_id)));
  const { data: profiles } = staffIds.length
    ? await admin.from("profiles").select("id, full_name, phone, role").in("id", staffIds)
    : { data: [] as StaffProfile[] };
  const byId = new Map(((profiles ?? []) as StaffProfile[]).map((member) => [member.id, member]));
  const onDuty = openShifts.map((shift) => ({ ...shift, staff: byId.get(shift.staff_id) }));

  return (
    <section className="mt-7 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm odancia-interactive-card">
      <div className="flex flex-col gap-3 border-b border-black/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 text-white"><Users className="h-4 w-4" /></div>
          <div><h2 className="text-sm font-semibold text-neutral-950">Currently on duty</h2><p className="mt-1 text-xs text-neutral-500">Staff with an open shift record.</p></div>
        </div>
        <div className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900">{shiftsError ? "—" : onDuty.length} on duty</div>
      </div>
      {shiftsError ? (
        <div className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-neutral-800">Attendance is not configured yet.</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">Apply the simplified staff setup migration <code>202610280001_admin_session_staff_passcodes.sql</code> in Supabase, then reload this page. It adds attendance and passcode authorization support without deleting existing service or payment rows.</p>
        </div>
      ) : onDuty.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500"><Clock3 className="h-5 w-5" /></div>
          <h3 className="mt-4 text-sm font-semibold text-neutral-900">No one is clocked in</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-neutral-500">When staff clock in, they will appear here. Multiple team members can be on duty at the same time.</p>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 odancia-stagger">
          {onDuty.map((shift) => (
            <div key={shift.id} className="odancia-interactive-card flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800"><UserRound className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-950">{shift.staff?.full_name ?? "Staff member"}</p>
                <p className="mt-1 text-xs text-neutral-500">{shift.staff?.phone ?? "No phone recorded"}</p>
                <p className="mt-2 text-[11px] font-medium text-emerald-800">Clocked in {new Date(shift.checked_in_at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
              </div>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="On duty" />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end border-t border-black/[0.05] bg-neutral-50/60 px-5 py-3 sm:px-6">
        <Link href="/dashboard/staff" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 transition hover:text-blue-800">Manage staff <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>
      </div>
    </section>
  );
}

function OnDutySectionSkeleton() {
  return (
    <section aria-label="Loading staff attendance" className="mt-7 overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><div className="odancia-shimmer h-10 w-10 rounded-xl" /><div className="flex-1"><div className="odancia-shimmer h-4 w-40" /><div className="odancia-shimmer mt-2 h-3 w-52 max-w-full" /></div><div className="odancia-shimmer h-9 w-24 rounded-xl" /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-2xl border border-neutral-100 p-4"><div className="odancia-shimmer h-4 w-32" /><div className="odancia-shimmer mt-3 h-3 w-24" /><div className="odancia-shimmer mt-3 h-3 w-36 max-w-full" /></div>)}</div>
    </section>
  );
}
