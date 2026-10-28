import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Package,
  Pencil,
  Phone,
  UserRound,
  WalletCards,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type ClientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/* ============================================================
   TYPES
============================================================ */

type ClientRecord = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type ServiceType = {
  id: string;
  name: string;
};

type ServiceRecord = {
  id: string;
  service_number: string | null;
  service_type_id: string | null;
  service_date: string | null;
  service_time: string | null;
  collection_date: string | null;
  total_price: number | null;
  deposit_amount: number | null;
  amount_paid: number | null;
  balance: number | null;
  payment_status: string | null;
  service_status: string | null;
  fulfillment_method: string | null;
  number_of_items: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  /*
   * IMPORTANT:
   * We normalize the Supabase relation to a single object.
   */
  service_types: ServiceType | null;
};

/*
 * This is the shape Supabase actually returns for the relation.
 *
 * Because Supabase is returning service_types as an array,
 * we intentionally type it as an array here and normalize it
 * before returning ServiceRecord[].
 */
type SupabaseServiceRecord = Omit<
  ServiceRecord,
  "service_types"
> & {
  service_types:
    | ServiceType[]
    | ServiceType
    | null;
};

/* ============================================================
   PAGE
============================================================ */

export default async function ClientDetailsPage({
  params,
}: ClientPageProps) {
  await requireOwnerOrAdmin();

  const { id } = await params;

  const {
    client,
    services,
  } = await getClientDetails(id);

  if (!client) {
    notFound();
  }

  const summary = buildSummary(services);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">

        {/* ====================================================
           BACK
        ==================================================== */}

        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to clients
        </Link>

        {/* ====================================================
           HEADER
        ==================================================== */}

        <header className="mt-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex min-w-0 items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-800 text-white">
                <UserRound className="h-6 w-6" />
              </div>

              <div className="min-w-0">

                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                  <span>Operations</span>

                  <span className="h-1 w-1 rounded-full bg-neutral-300" />

                  <span>Clients</span>
                </div>

                <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                  {client.full_name}
                </h1>

                <p className="mt-1 font-mono text-[10px] text-neutral-400">
                  {client.id}
                </p>

              </div>
            </div>

            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-semibold text-white transition hover:bg-blue-900"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit client
            </Link>

          </div>
        </header>

        {/* ====================================================
           CONTACT
        ==================================================== */}

        <section className="mt-7 grid gap-3 sm:grid-cols-2">

          <ContactCard
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={
              client.phone?.trim()
                ? client.phone
                : "No phone number"
            }
            href={
              client.phone?.trim()
                ? `tel:${client.phone}`
                : undefined
            }
          />

          <ContactCard
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={
              client.email?.trim()
                ? client.email
                : "No email address"
            }
            href={
              client.email?.trim()
                ? `mailto:${client.email}`
                : undefined
            }
          />

        </section>

        {/* ====================================================
           SERVICE SUMMARY
        ==================================================== */}

        <section className="mt-5 grid gap-3 sm:grid-cols-4">

          <SummaryCard
            icon={<Package className="h-4 w-4" />}
            label="Total services"
            value={summary.total}
          />

          <SummaryCard
            icon={<Clock3 className="h-4 w-4" />}
            label="Pending"
            value={summary.pending}
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Ready"
            value={summary.ready}
          />

          <SummaryCard
            icon={<WalletCards className="h-4 w-4" />}
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            valueIsText
          />

        </section>

        {/* ====================================================
           SERVICES
        ==================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          {/* HEADER */}

          <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="text-sm font-semibold text-neutral-950">
                  Service history
                </h2>

                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Every laundry service associated with this client
                </p>

              </div>

              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-500">
                {services.length}{" "}
                {services.length === 1
                  ? "service"
                  : "services"}
              </span>

            </div>

          </div>

          {/* EMPTY */}

          {services.length === 0 ? (
            <EmptyServices />
          ) : (
            <>
              {/* =================================================
                 DESKTOP
              ================================================= */}

              <div className="hidden overflow-x-auto sm:block">

                <table className="w-full min-w-[900px]">

                  <thead>

                    <tr className="border-b border-black/[0.05] bg-neutral-50/70 text-left">

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Service
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Price
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Payment
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Fulfillment
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Status
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-black/[0.05]">

                    {services.map((service) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                      />
                    ))}

                  </tbody>

                </table>

              </div>

              {/* =================================================
                 MOBILE
              ================================================= */}

              <div className="divide-y divide-black/[0.05] sm:hidden">

                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                  />
                ))}

              </div>
            </>
          )}

        </section>

      </div>
    </main>
  );
}

/* ============================================================
   DATA
============================================================ */

async function getClientDetails(
  id: string,
): Promise<{
  client: ClientRecord | null;
  services: ServiceRecord[];
}> {
  const supabase = await createClient();

  const [
    clientResult,
    servicesResult,
  ] = await Promise.all([
    /* ========================================================
       CLIENT
    ======================================================== */

    supabase
      .from("clients")
      .select(
        "id, full_name, phone, email, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),

    /* ========================================================
       SERVICES
    ======================================================== */

    supabase
      .from("services")
      .select(`
        id,
        service_number,
        service_type_id,
        service_date,
        service_time,
        collection_date,
        total_price,
        deposit_amount,
        amount_paid,
        balance,
        payment_status,
        service_status,
        fulfillment_method,
        number_of_items,
        notes,
        created_at,
        updated_at,
        service_types (
          id,
          name
        )
      `)
      .eq("client_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  /* ==========================================================
     ERROR HANDLING
  ========================================================== */

  if (clientResult.error) {
    console.error(
      "CLIENT DETAILS LOAD FAILED:",
      clientResult.error,
    );
  }

  if (servicesResult.error) {
    console.error(
      "CLIENT SERVICES LOAD FAILED:",
      servicesResult.error,
    );
  }

  /* ==========================================================
     CLIENT
  ========================================================== */

  const client =
    (clientResult.data as ClientRecord | null) ??
    null;

  /* ==========================================================
     SERVICES
     
     DO NOT CAST DIRECTLY TO ServiceRecord[].
     
     Supabase returns service_types as an array.
     We normalize it here.
  ========================================================== */

  const rawServices =
    (servicesResult.data as
      | SupabaseServiceRecord[]
      | null) ?? [];

  const services: ServiceRecord[] =
    rawServices.map((service) => ({
      id: service.id,

      service_number:
        service.service_number,

      service_type_id:
        service.service_type_id,

      service_date:
        service.service_date,

      service_time:
        service.service_time,

      collection_date:
        service.collection_date,

      total_price:
        service.total_price,

      deposit_amount:
        service.deposit_amount,

      amount_paid:
        service.amount_paid,

      balance:
        service.balance,

      payment_status:
        service.payment_status,

      service_status:
        service.service_status,

      fulfillment_method:
        service.fulfillment_method,

      number_of_items:
        service.number_of_items,

      notes:
        service.notes,

      created_at:
        service.created_at,

      updated_at:
        service.updated_at,

      /*
       * Supabase may return:
       *
       * service_types: [...]
       *
       * Convert that into:
       *
       * service_types: {...}
       */

      service_types:
        Array.isArray(service.service_types)
          ? service.service_types[0] ?? null
          : service.service_types ?? null,
    }));

  return {
    client,
    services,
  };
}

/* ============================================================
   SUMMARY
============================================================ */

function buildSummary(
  services: ServiceRecord[],
) {
  return services.reduce(
    (result, service) => {

      result.total += 1;

      switch (service.service_status) {
        case "pending":
          result.pending += 1;
          break;

        case "ready_for_collection":
          result.ready += 1;
          break;

        case "collected":
          result.collected += 1;
          break;
      }

      result.outstanding += Number(
        service.balance ?? 0,
      );

      return result;
    },
    {
      total: 0,
      pending: 0,
      ready: 0,
      collected: 0,
      outstanding: 0,
    },
  );
}

/* ============================================================
   CONTACT CARD
============================================================ */

function ContactCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
          {label}
        </p>

        <p className="mt-1 truncate text-sm font-medium text-neutral-950">
          {value}
        </p>

      </div>
    </>
  );

  if (!href) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition hover:bg-neutral-50"
    >
      {content}
    </a>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  label,
  value,
  valueIsText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  valueIsText?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">

      <div className="flex items-start justify-between gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-800 text-white">
          {icon}
        </div>

        <span
          className={
            valueIsText
              ? "text-base font-semibold tracking-tight text-neutral-950"
              : "text-2xl font-semibold tracking-tight text-neutral-950"
          }
        >
          {value}
        </span>

      </div>

      <p className="mt-4 text-xs font-semibold text-neutral-950">
        {label}
      </p>

    </div>
  );
}

/* ============================================================
   SERVICE ROW
============================================================ */

function ServiceRow({
  service,
}: {
  service: ServiceRecord;
}) {
  return (
    <tr className="transition hover:bg-neutral-50/60">

      {/* SERVICE */}

      <td className="px-5 py-4">

        <p className="text-xs font-semibold text-neutral-950">
          {service.service_types?.name ??
            "Laundry service"}
        </p>

        <p className="mt-1 font-mono text-[10px] text-neutral-400">
          {service.service_number ??
            `#${service.id
              .slice(0, 8)
              .toUpperCase()}`}
        </p>

      </td>

      {/* DATE */}

      <td className="px-5 py-4">

        <div className="flex items-center gap-2 text-xs text-neutral-600">

          <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />

          <div>

            <p>
              {formatDate(
                service.service_date,
              )}
            </p>

            {service.service_time ? (
              <p className="mt-0.5 text-[10px] text-neutral-400">
                {formatTime(
                  service.service_time,
                )}
              </p>
            ) : null}

          </div>

        </div>

      </td>

      {/* PRICE */}

      <td className="px-5 py-4">

        <p className="text-xs font-semibold text-neutral-950">
          {formatCurrency(
            Number(
              service.total_price ?? 0,
            ),
          )}
        </p>

        <p className="mt-1 text-[10px] text-neutral-400">
          {service.number_of_items
            ? `${service.number_of_items} items`
            : "Items not specified"}
        </p>

      </td>

      {/* PAYMENT */}

      <td className="px-5 py-4">

        <PaymentBadge
          status={
            service.payment_status
          }
        />

        <p className="mt-1 text-[10px] text-neutral-400">
          Balance{" "}
          {formatCurrency(
            Number(
              service.balance ?? 0,
            ),
          )}
        </p>

      </td>

      {/* FULFILLMENT */}

      <td className="px-5 py-4">

        <p className="text-xs text-neutral-600">
          {service.fulfillment_method ===
          "delivery"
            ? "Delivery"
            : "Customer pickup"}
        </p>

        <p className="mt-1 text-[10px] text-neutral-400">
          {service.collection_date
            ? `Collection ${formatDate(
                service.collection_date,
              )}`
            : "No collection date"}
        </p>

      </td>

      {/* STATUS */}

      <td className="px-5 py-4">

        <StatusBadge
          status={
            service.service_status
          }
        />

      </td>

    </tr>
  );
}

/* ============================================================
   MOBILE SERVICE CARD
============================================================ */

function ServiceCard({
  service,
}: {
  service: ServiceRecord;
}) {
  return (
    <div className="p-5">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-neutral-950">
            {service.service_types?.name ??
              "Laundry service"}
          </p>

          <p className="mt-1 font-mono text-[10px] text-neutral-400">
            {service.service_number ??
              `#${service.id
                .slice(0, 8)
                .toUpperCase()}`}
          </p>

        </div>

        <StatusBadge
          status={
            service.service_status
          }
        />

      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <MobileDetail
          label="Date"
          value={formatDate(
            service.service_date,
          )}
        />

        <MobileDetail
          label="Price"
          value={formatCurrency(
            Number(
              service.total_price ?? 0,
            ),
          )}
        />

        <MobileDetail
          label="Payment"
          value={paymentLabel(
            service.payment_status,
          )}
        />

        <MobileDetail
          label="Balance"
          value={formatCurrency(
            Number(
              service.balance ?? 0,
            ),
          )}
        />

        <MobileDetail
          label="Fulfillment"
          value={
            service.fulfillment_method ===
            "delivery"
              ? "Delivery"
              : "Customer pickup"
          }
        />

        <MobileDetail
          label="Items"
          value={
            service.number_of_items
              ? String(
                  service.number_of_items,
                )
              : "—"
          }
        />

      </div>

      {service.collection_date ? (
        <div className="mt-4 flex items-center gap-2 border-t border-black/[0.05] pt-4 text-xs text-neutral-400">

          <CalendarDays className="h-3.5 w-3.5" />

          Collection{" "}
          {formatDate(
            service.collection_date,
          )}

        </div>
      ) : null}

    </div>
  );
}

/* ============================================================
   MOBILE DETAIL
============================================================ */

function MobileDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">

      <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium text-neutral-950">
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   STATUS
============================================================ */

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    pending: {
      label: "Pending",
      className:
        "bg-amber-50 text-amber-700 ring-amber-600/10",
    },

    ready_for_collection: {
      label: "Ready",
      className:
        "bg-blue-50 text-blue-700 ring-blue-600/10",
    },

    collected: {
      label: "Collected",
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    },
  };

  const item =
    config[status ?? "pending"] ??
    config.pending;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}

/* ============================================================
   PAYMENT
============================================================ */

function PaymentBadge({
  status,
}: {
  status: string | null;
}) {
  const label = paymentLabel(status);

  const className =
    status === "paid"
      ? "text-emerald-600"
      : status === "partial"
        ? "text-amber-600"
        : "text-red-500";

  return (
    <p
      className={`text-xs font-semibold ${className}`}
    >
      {label}
    </p>
  );
}

function paymentLabel(
  status: string | null,
) {
  switch (status) {
    case "paid":
      return "Paid";

    case "partial":
      return "Deposit";

    case "unpaid":
      return "Unpaid";

    default:
      return "Unpaid";
  }
}

/* ============================================================
   EMPTY SERVICES
============================================================ */

function EmptyServices() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <Package className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-sm font-semibold text-neutral-950">
        No services yet
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-400">
        This client has not had any laundry
        services registered yet.
      </p>

    </div>
  );
}

/* ============================================================
   FORMAT CURRENCY
============================================================ */

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

/* ============================================================
   FORMAT TIME
============================================================ */

function formatTime(
  value: string,
) {
  const [
    hours,
    minutes,
  ] = value.split(":");

  const date = new Date();

  date.setHours(
    Number(hours),
    Number(minutes),
    0,
    0,
  );

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}