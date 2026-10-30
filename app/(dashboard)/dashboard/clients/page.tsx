import Link from "next/link";

import {
  Activity,
  Mail,
  Phone,
  Plus,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import {
  requireOwnerOrAdmin,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import type {
  Client,
  ClientSummary,
} from "./types";

type ClientsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function ClientsPage({
  searchParams,
}: ClientsPageProps) {
  await requireOwnerOrAdmin();

  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const {
    clients,
    summary,
  } = await getClients(search);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">

        {/* HEADER */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Operations</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Clients</span>
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Clients
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Manage your laundry customers, contact
                information, and customer records.
              </p>
            </div>

            <Link
              href="/dashboard/clients/new"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-semibold text-white transition hover:bg-blue-900"
            >
              <Plus className="h-3.5 w-3.5" />
              Add client
            </Link>
          </div>
        </header>

        {/* SUMMARY */}

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Total clients"
            value={summary.total}
            description="All customer records"
          />

          <SummaryCard
            icon={<Phone className="h-4 w-4" />}
            label="Phone numbers"
            value={summary.withPhone}
            description="Clients with phone contact"
          />

          <SummaryCard
            icon={<Mail className="h-4 w-4" />}
            label="Email addresses"
            value={summary.withEmail}
            description="Clients with email contact"
          />
        </section>

        {/* CLIENT LIST */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          {/* TOOLBAR */}

          <div className="border-b border-black/[0.06] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-sm font-semibold text-neutral-950">
                  Customer directory
                </h2>

                <p className="mt-0.5 text-[11px] text-neutral-400">
                  People registered with Odancia Laundry
                </p>
              </div>

              <form
                method="GET"
                className="w-full sm:w-[300px]"
              >
                <div className="relative">
                  <Activity className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />

                  <input
                    type="search"
                    name="q"
                    defaultValue={search}
                    placeholder="Search clients..."
                    className="h-10 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-9 pr-3 text-xs text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
                  />
                </div>
              </form>

            </div>
          </div>

          {clients.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            <>
              {/* DESKTOP HEADER */}

              <div className="hidden grid-cols-[minmax(240px,1fr)_190px_minmax(220px,1fr)_100px] gap-4 border-b border-black/[0.05] bg-neutral-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400 sm:grid sm:px-6">
                <span>Client</span>
                <span>Phone</span>
                <span>Email</span>
                <span />
              </div>

              {/* ROWS */}

              <div className="divide-y divide-black/[0.05]">
                {clients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* FOOTER */}

        <div className="mt-5 flex flex-col gap-1 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {clients.length}{" "}
            {clients.length === 1 ? "client" : "clients"} shown
            {search ? ` for "${search}"` : ""}
          </p>

          <p>
            Client records are managed securely through Supabase.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   DATA
============================================================ */

async function getClients(
  search: string,
): Promise<{
  clients: Client[];
  summary: ClientSummary;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select(
      "id, full_name, phone, email, created_at, updated_at",
    );

  if (search) {
    const escapedSearch = search
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    query = query.or(
      [
        `full_name.ilike.%${escapedSearch}%`,
        `phone.ilike.%${escapedSearch}%`,
        `email.ilike.%${escapedSearch}%`,
      ].join(","),
    );
  }

  const {
    data,
    error,
  } = await query.order(
    "created_at",
    {
      ascending: false,
    },
  );

  if (error) {
    console.error(
      "CLIENTS LOAD FAILED:",
      error,
    );

    return {
      clients: [],
      summary: {
        total: 0,
        withPhone: 0,
        withEmail: 0,
      },
    };
  }

  const clients = (data ?? []) as Client[];

  return {
    clients,
    summary: buildSummary(clients),
  };
}

function buildSummary(
  clients: Client[],
): ClientSummary {
  return {
    total: clients.length,

    withPhone: clients.filter(
      (client) =>
        Boolean(client.phone?.trim()),
    ).length,

    withEmail: clients.filter(
      (client) =>
        Boolean(client.email?.trim()),
    ).length,
  };
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-800 text-white">
          {icon}
        </div>

        <span className="text-2xl font-semibold tracking-tight text-neutral-950">
          {value}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold text-neutral-950">
        {label}
      </p>

      <p className="mt-1 text-[11px] text-neutral-400">
        {description}
      </p>
    </div>
  );
}

/* ============================================================
   CLIENT ROW
============================================================ */

function ClientRow({
  client,
}: {
  client: Client;
}) {
  return (
    <div className="group relative px-5 py-4 transition hover:bg-blue-50/40 sm:px-6">
      <Link href={`/dashboard/clients/${client.id}`} aria-label={`Open client ${client.full_name}`} className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600" />
      <div className="pointer-events-none relative z-10 hidden grid-cols-[minmax(240px,1fr)_190px_minmax(220px,1fr)_100px] items-center gap-4 sm:grid">
        <ClientIdentity client={client} />
        <ContactPhone phone={client.phone} />
        <ContactEmail email={client.email} />
        <span className="inline-flex h-9 items-center justify-center rounded-xl border border-black/[0.07] bg-white px-3 text-[11px] font-semibold text-neutral-700 transition group-hover:border-blue-200 group-hover:text-blue-800">View <span className="ml-1" aria-hidden="true">↗</span></span>
      </div>
      <div className="pointer-events-none relative z-10 sm:hidden">
        <div className="flex items-start justify-between gap-4"><ClientIdentity client={client}/><span className="shrink-0 text-xs font-semibold text-blue-700">Open ↗</span></div>
        <div className="mt-4 space-y-2"><ContactPhone phone={client.phone}/><ContactEmail email={client.email}/></div>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENT IDENTITY
============================================================ */

function ClientIdentity({
  client,
}: {
  client: Client;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
        <UserRound className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">
          {client.full_name}
        </p>

        <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-400">
          {client.id}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PHONE
============================================================ */

function ContactPhone({
  phone,
}: {
  phone: string;
}) {
  if (!phone?.trim()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
        <Phone className="h-3 w-3" />
        No phone
      </span>
    );
  }

  return (
    <a
      href={`tel:${phone}`}
      className="pointer-events-auto relative z-20 inline-flex max-w-full items-center gap-1.5 text-[11px] text-neutral-500 transition hover:text-neutral-950"
    >
      <Phone className="h-3 w-3 shrink-0" />

      <span className="truncate">
        {phone}
      </span>
    </a>
  );
}

/* ============================================================
   EMAIL
============================================================ */

function ContactEmail({
  email,
}: {
  email: string | null;
}) {
  if (!email?.trim()) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
        <Mail className="h-3 w-3" />
        No email
      </span>
    );
  }

  return (
    <a
      href={`mailto:${email}`}
      className="pointer-events-auto relative z-20 inline-flex max-w-full items-center gap-1.5 text-[11px] text-neutral-500 transition hover:text-neutral-950"
    >
      <Mail className="h-3 w-3 shrink-0" />

      <span className="truncate">
        {email}
      </span>
    </a>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  search,
}: {
  search: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        {search ? (
          <XCircle className="h-6 w-6" />
        ) : (
          <Users className="h-6 w-6" />
        )}
      </div>

      <h3 className="mt-5 text-base font-semibold text-neutral-950">
        {search
          ? "No clients found"
          : "No clients yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-400">
        {search
          ? `No clients matched "${search}". Try another search.`
          : "Add your first client to begin managing your customer records."}
      </p>

      {search ? (
        <Link
          href="/dashboard/clients"
          className="mt-5 inline-flex h-10 items-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Clear search
        </Link>
      ) : (
        <Link
          href="/dashboard/clients/new"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-semibold text-white transition hover:bg-blue-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Add client
        </Link>
      )}
    </div>
  );
}