import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import ShiftCard from "./ShiftCard";

export default async function ShiftPage() {
  await requireOwnerOrAdmin();
  const admin = createAdminClient();

  const [{ data: profiles, error: profilesError }, { data: shifts, error: shiftsError }] = await Promise.all([
    admin.from("profiles").select("id, full_name, phone, is_active, role").eq("role", "staff").order("full_name", { ascending: true }),
    admin.from("staff_shifts").select("id, staff_id, checked_in_at").is("checked_out_at", null).order("checked_in_at", { ascending: true }),
  ]);

  const setupError = Boolean(profilesError || shiftsError);
  const shiftByStaff = new Map((shifts ?? []).map((shift) => [shift.staff_id, shift]));
  const team = (profiles ?? [])
    .filter((member) => member.is_active || shiftByStaff.has(member.id))
    .map((member) => ({ ...member, shift: shiftByStaff.get(member.id) ?? null }));
  const onDuty = team.filter((member) => Boolean(member.shift)).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Team operations</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Staff attendance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">An administrator manages all team members’ shift start and finish times from this page. Multiple staff can be on duty simultaneously.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-700">On duty now</p><p className="mt-1 text-3xl font-bold tracking-tight text-blue-950">{setupError ? "—" : onDuty}</p></div>
        </header>

        {setupError ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6"><h2 className="text-sm font-semibold text-red-950">Attendance setup is not complete</h2><p className="mt-2 text-sm leading-6 text-red-800">Apply the complete migration <code className="rounded bg-white/70 px-1 py-0.5">202610280001_admin_session_staff_passcodes.sql</code> in Supabase, then reload this page. If you see an SQL error, send the complete error message instead of running a fragment.</p></section>
        ) : team.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-5 py-12 text-center sm:px-6"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">👥</div><h2 className="mt-4 text-sm font-semibold text-slate-950">No staff records yet</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Add your team members in Staff first. Their attendance controls will appear here.</p></section>
        ) : (
          <ShiftCard staffMembers={team} />
        )}
      </div>
    </main>
  );
}
