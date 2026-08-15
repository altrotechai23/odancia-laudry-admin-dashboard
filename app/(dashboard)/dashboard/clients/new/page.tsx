import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import ClientCreateForm from "./ClientCreateForm";



export default async function NewClientPage() {
  await requireOwnerOrAdmin();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[900px]">
        <header>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to clients
          </Link>

          <div className="mt-6 flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Operations</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Clients</span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
                Add client
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Create a new customer record for Odancia Laundry.
              </p>
            </div>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <ClientCreateForm />
        </section>
      </div>
    </main>
  );
}