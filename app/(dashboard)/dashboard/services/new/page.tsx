import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { getServiceTypes } from "@/lib/db/service-types";
import NewServiceForm from "../components/new-service-form";


export default async function NewServicePage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await requireOwnerOrAdmin();
  const [{ clientId }, serviceTypes] = await Promise.all([searchParams, getServiceTypes()]);
  let initialClient = null as { id: string; full_name: string; phone: string; email: string | null } | null;
  if (clientId) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id, full_name, phone, email").eq("id", clientId).maybeSingle();
    initialClient = data;
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Service operations</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">New laundry service</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Create a service and track payments. Use admin code 0000, or a unique 4-digit code from an active staff member who is on duty, to authorize each service write.</p>
        </div>
        <NewServiceForm serviceTypes={serviceTypes} initialClient={initialClient} />
      </div>
    </main>
  );
}