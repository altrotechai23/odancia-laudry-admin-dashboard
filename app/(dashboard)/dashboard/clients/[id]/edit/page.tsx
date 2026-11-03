import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import ClientEditForm from "./ClientEditForm";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwnerOrAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const { data: client, error } = await supabase.from("clients").select("id, full_name, phone, email").eq("id", id).maybeSingle();
  if (error || !client) notFound();
  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-4xl">
    <Link href={`/dashboard/clients/${id}`} className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Back to client</Link>
    <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Client management</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-950">Edit client</h1><p className="mt-2 text-sm text-neutral-500">Update contact details or add a new laundry service.</p></div>
      <Link href={`/dashboard/services/new?clientId=${id}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-semibold text-white hover:bg-blue-900"><Plus className="h-4 w-4" /> Add service</Link></div>
    <ClientEditForm client={client} />
  </div></main>;
}
