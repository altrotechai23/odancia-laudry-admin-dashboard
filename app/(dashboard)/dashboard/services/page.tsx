import Link from "next/link";

import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  Search,
  Truck,
  UserRound,
} from "lucide-react";

import { requireUser } from "@/lib/auth/get-current-user";

import {
  getServices,
  type LaundryService,
  type ServicesSummary,
} from "@/lib/services/get-services";


/* ============================================================
   TYPES
============================================================ */

type ServiceStatusFilter =
  | "pending"
  | "ready_for_collection"
  | "collected"
  | "all";

type ServicesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};


/* ============================================================
   STATUS PARSER
============================================================ */

function parseServiceStatus(
  value: string | undefined,
): ServiceStatusFilter {
  switch (value) {
    case "pending":
      return "pending";

    case "ready_for_collection":
      return "ready_for_collection";

    case "collected":
      return "collected";

    default:
      return "all";
  }
}


/* ============================================================
   FILTER URL
============================================================ */

function buildFilterUrl(
  status: ServiceStatusFilter,
  query: string,
) {
  const params = new URLSearchParams();

  const trimmedQuery =
    query.trim();

  /*
   * Only add q when the user actually
   * entered a search query.
   */
  if (trimmedQuery) {
    params.set(
      "q",
      trimmedQuery,
    );
  }

  /*
   * "all" means no status parameter.
   */
  if (status !== "all") {
    params.set(
      "status",
      status,
    );
  }

  const search =
    params.toString();

  return search
    ? `/dashboard/services?${search}`
    : "/dashboard/services";
}


/* ============================================================
   PAGE
============================================================ */

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const profile =
    await requireUser();

  const params =
    await searchParams;

  const query =
    typeof params.q === "string"
      ? params.q
      : "";

  /*
   * IMPORTANT:
   *
   * parseServiceStatus() always returns
   * "all" instead of null.
   *
   * This fixes:
   *
   * Type 'ServiceStatus | null' is not
   * assignable to ...
   */
  const status =
    parseServiceStatus(
      params.status,
    );

  const {
    services: allServices,
    summary: allSummary,
  } = await getServices();


  /* ==========================================================
     SEARCH
  ========================================================== */

  const normalizedQuery =
    query.trim().toLowerCase();

  let services =
    allServices;


  if (normalizedQuery) {
    services =
      services.filter(
        (service) => {
          const searchableText =
            [
              service.service_number,
              service.client_name,
              service.phone,
              service.email,
              service.service_type_name,
              service.staff_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return searchableText.includes(
            normalizedQuery,
          );
        },
      );
  }


  /* ==========================================================
     STATUS FILTER
  ========================================================== */

  if (status !== "all") {
    services =
      services.filter(
        (service) =>
          service.service_status ===
          status,
      );
  }


  /* ==========================================================
     FILTERED SUMMARY
  ========================================================== */

  const summary =
    buildSummary(services);


  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">

                <span>
                  Operations
                </span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>
                  Services
                </span>

              </div>


              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Laundry services
              </h1>


              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Manage laundry orders, payments,
                collections and customer services
                from one workspace.
              </p>

            </div>


            <Link
              href="/dashboard/services/new"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />

              New service

              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

          </div>
        </header>


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <QuickStat
            label="Pending"
            value={String(summary.pending)}
            icon={
              <Clock3 className="h-4 w-4" />
            }
            description="Currently processing"
          />


          <QuickStat
            label="Ready"
            value={String(summary.ready)}
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            description="Ready for collection"
          />


          <QuickStat
            label="Collected"
            value={String(summary.collected)}
            icon={
              <Package className="h-4 w-4" />
            }
            description="Completed services"
          />


          <QuickStat
            label="Outstanding"
            value={formatCurrency(
              summary.outstanding,
            )}
            icon={
              <Banknote className="h-4 w-4" />
            }
            description="Customer balances"
            emphasis
          />

        </section>


        {/* ==================================================
            SERVICE TABLE
        ================================================== */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          {/* ==================================================
              TOOLBAR
          ================================================== */}

          <div className="border-b border-black/[0.06] p-4 sm:p-5">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              {/* Search */}

              <form
                action="/dashboard/services"
                method="GET"
                className="w-full lg:max-w-md"
              >

                {status !== "all" && (
                  <input
                    type="hidden"
                    name="status"
                    value={status}
                  />
                )}

                <div className="relative">

                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search client, phone or service..."
                    className="h-11 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:bg-white focus:ring-4 focus:ring-black/[0.03]"
                  />

                </div>

              </form>


              {/* Filters */}

              <div className="flex gap-2 overflow-x-auto">

                <FilterLink
                  href={buildFilterUrl(
                    "all",
                    query,
                  )}
                  active={
                    status === "all"
                  }
                >
                  All
                </FilterLink>


                <FilterLink
                  href={buildFilterUrl(
                    "pending",
                    query,
                  )}
                  active={
                    status === "pending"
                  }
                >
                  Pending
                </FilterLink>


                <FilterLink
                  href={buildFilterUrl(
                    "ready_for_collection",
                    query,
                  )}
                  active={
                    status ===
                    "ready_for_collection"
                  }
                >
                  Ready
                </FilterLink>


                <FilterLink
                  href={buildFilterUrl(
                    "collected",
                    query,
                  )}
                  active={
                    status === "collected"
                  }
                >
                  Collected
                </FilterLink>

              </div>

            </div>


            {/* Active search */}

            {(query.trim() ||
              status !== "all") && (
              <div className="mt-3 flex flex-wrap items-center gap-2">

                <span className="text-[11px] text-neutral-400">
                  Showing
                </span>


                {query.trim() && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">
                    Search: {query}
                  </span>
                )}


                {status !== "all" && (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">
                    Status:{" "}
                    {getStatusLabel(
                      status,
                    )}
                  </span>
                )}


                <Link
                  href="/dashboard/services"
                  className="ml-1 text-[11px] font-medium text-neutral-500 underline-offset-2 transition hover:text-neutral-950 hover:underline"
                >
                  Clear filters
                </Link>

              </div>
            )}

          </div>


          {/* ==================================================
              EMPTY STATE
          ================================================== */}

          {services.length === 0 ? (
            <FilteredEmptyState
              hasFilters={
                Boolean(
                  query.trim(),
                ) ||
                status !== "all"
              }
            />
          ) : (

            <>

              {/* ==================================================
                  DESKTOP TABLE
              ================================================== */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[1100px] border-collapse">

                  <thead>

                    <tr className="border-b border-black/[0.06] bg-neutral-50/70 text-left">

                      <TableHeader>
                        Service
                      </TableHeader>

                      <TableHeader>
                        Client
                      </TableHeader>

                      <TableHeader>
                        Service type
                      </TableHeader>

                      <TableHeader>
                        Price
                      </TableHeader>

                      <TableHeader>
                        Balance
                      </TableHeader>

                      <TableHeader>
                        Status
                      </TableHeader>

                      <TableHeader>
                        Collection
                      </TableHeader>

                      <TableHeader>
                        Staff
                      </TableHeader>

                    </tr>

                  </thead>


                  <tbody>

                    {services.map(
                      (service) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                        />
                      ),
                    )}

                  </tbody>

                </table>

              </div>


              {/* ==================================================
                  MOBILE
              ================================================== */}

              <div className="divide-y divide-black/[0.06] md:hidden">

                {services.map(
                  (service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                    />
                  ),
                )}

              </div>

            </>

          )}

        </section>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="mt-5 flex flex-col items-center justify-between gap-2 text-xs text-neutral-400 sm:flex-row">

          <p>
            {services.length}{" "}
            {services.length === 1
              ? "service"
              : "services"}{" "}
            shown
          </p>


          <p>
            Signed in as{" "}
            <span className="font-medium text-neutral-600">
              {profile.full_name}
            </span>
          </p>

        </div>

      </div>
    </main>
  );
}


/* ============================================================
   SUMMARY BUILDER
============================================================ */

function buildSummary(
  services: LaundryService[],
): ServicesSummary {
  return services.reduce<ServicesSummary>(
    (result, service) => {

      switch (
        service.service_status
      ) {
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


      result.outstanding +=
        service.balance;

      return result;
    },
    {
      pending: 0,
      ready: 0,
      collected: 0,
      outstanding: 0,
    },
  );
}


/* ============================================================
   FILTER LINK
============================================================ */

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-medium transition ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-black/[0.07] bg-white text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {children}
    </Link>
  );
}


/* ============================================================
   QUICK STAT
============================================================ */

function QuickStat({
  label,
  value,
  description,
  icon,
  emphasis = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 transition ${
        emphasis
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-black/[0.06] bg-white"
      }`}
    >

      <div className="flex items-center justify-between">

        <p
          className={`text-xs ${
            emphasis
              ? "text-white/50"
              : "text-neutral-400"
          }`}
        >
          {label}
        </p>


        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            emphasis
              ? "bg-white/10 text-white"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {icon}
        </span>

      </div>


      <p
        className={`mt-3 text-xl font-semibold tracking-tight ${
          emphasis
            ? "text-white"
            : "text-neutral-950"
        }`}
      >
        {value}
      </p>


      <p
        className={`mt-1 text-[11px] ${
          emphasis
            ? "text-white/40"
            : "text-neutral-400"
        }`}
      >
        {description}
      </p>

    </div>
  );
}


/* ============================================================
   TABLE HEADER
============================================================ */

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
      {children}
    </th>
  );
}


/* ============================================================
   SERVICE ROW
============================================================ */

function ServiceRow({
  service,
}: {
  service: LaundryService;
}) {
  return (
    <tr className="group border-b border-black/[0.05] transition hover:bg-neutral-50/70">

      <td className="px-5 py-4">

        <div>

          <Link
  href={`/dashboard/services/${service.id}`}
  className="text-xs font-semibold text-neutral-950 transition hover:underline"
>
  {service.service_number ??
    shortServiceId(service.id)}
</Link>


          <p className="mt-1 text-[11px] text-neutral-400">

            {formatDate(
              service.service_date,
            )}

            {service.service_time &&
              ` · ${formatTime(
                service.service_time,
              )}`}

          </p>

        </div>

      </td>


      <td className="px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <UserRound className="h-4 w-4" />
          </div>


          <div className="min-w-0">

            <p className="truncate text-sm font-medium text-neutral-950">
              {service.client_name}
            </p>


            <p className="mt-0.5 text-[11px] text-neutral-400">
              {service.phone}
            </p>

          </div>

        </div>

      </td>


      <td className="px-5 py-4">

        <p className="text-sm text-neutral-700">
          {service.service_type_name ??
            "Laundry service"}
        </p>


        {service.number_of_items && (
          <p className="mt-1 text-[11px] text-neutral-400">
            {service.number_of_items}{" "}
            {service.number_of_items === 1
              ? "item"
              : "items"}
          </p>
        )}

      </td>


      <td className="px-5 py-4">

        <p className="text-sm font-medium text-neutral-950">
          {formatCurrency(
            service.price,
          )}
        </p>


        {service.deposit > 0 && (
          <p className="mt-1 text-[11px] text-neutral-400">
            Paid{" "}
            {formatCurrency(
              service.deposit,
            )}
          </p>
        )}

      </td>


      <td className="px-5 py-4">

        <p
          className={`text-sm font-semibold ${
            service.balance > 0
              ? "text-amber-700"
              : "text-emerald-600"
          }`}
        >
          {formatCurrency(
            service.balance,
          )}
        </p>


        <PaymentBadge
          status={
            service.payment_status
          }
        />

      </td>


      <td className="px-5 py-4">

        <StatusBadge
          status={
            service.service_status
          }
        />

      </td>


      <td className="px-5 py-4">

        <div className="flex items-center gap-2">

          {service.fulfillment_method ===
          "delivery" ? (
            <Truck className="h-3.5 w-3.5 text-neutral-400" />
          ) : (
            <Package className="h-3.5 w-3.5 text-neutral-400" />
          )}


          <div>

            <p className="text-xs font-medium text-neutral-700">
              {service.collection_date
                ? formatDate(
                    service.collection_date,
                  )
                : "Not set"}
            </p>


            <p className="mt-0.5 text-[10px] text-neutral-400">
              {service.fulfillment_method ===
              "delivery"
                ? "Delivery"
                : "Pickup"}
            </p>

          </div>

        </div>

      </td>


      <td className="px-5 py-4">

        <p className="text-xs text-neutral-600">
          {service.staff_name ??
            "—"}
        </p>

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
  service: LaundryService;
}) {
  return (
    <div className="p-5">

      <div className="flex items-start justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <UserRound className="h-4 w-4" />
          </div>


          <div className="min-w-0">

            <p className="truncate text-sm font-semibold text-neutral-950">
              {service.client_name}
            </p>


            <p className="mt-0.5 text-xs text-neutral-400">
              {service.phone}
            </p>

          </div>

        </div>


        <StatusBadge
          status={
            service.service_status
          }
        />

      </div>


      <div className="mt-5 grid grid-cols-2 gap-3">

        <MobileDetail
          label="Service"
          value={
            service.service_type_name ??
            "Laundry"
          }
        />


        <MobileDetail
          label="Price"
          value={formatCurrency(
            service.price,
          )}
        />


        <MobileDetail
          label="Balance"
          value={formatCurrency(
            service.balance,
          )}
          highlight={
            service.balance > 0
          }
        />


        <MobileDetail
          label="Collection"
          value={
            service.collection_date
              ? formatDate(
                  service.collection_date,
                )
              : "Not set"
          }
        />

      </div>


      <div className="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-4">

        <div className="flex items-center gap-2 text-xs text-neutral-400">

          <CalendarDays className="h-3.5 w-3.5" />

          {formatDate(
            service.service_date,
          )}

        </div>


        <div className="flex items-center gap-2 text-xs text-neutral-400">

          <UserRound className="h-3.5 w-3.5" />

          {service.staff_name ??
            "—"}

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   MOBILE DETAIL
============================================================ */

function MobileDetail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3">

      <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>


      <p
        className={`mt-1 truncate text-xs font-medium ${
          highlight
            ? "text-amber-700"
            : "text-neutral-800"
        }`}
      >
        {value}
      </p>

    </div>
  );
}


/* ============================================================
   STATUS BADGE
============================================================ */

function StatusBadge({
  status,
}: {
  status: LaundryService["service_status"];
}) {
  const config = {
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
  } as const;


  const item =
    config[status] ??
    config.pending;


  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}


/* ============================================================
   PAYMENT BADGE
============================================================ */

function PaymentBadge({
  status,
}: {
  status: LaundryService["payment_status"];
}) {
  const config = {
    unpaid: {
      label: "Unpaid",
      className:
        "text-red-500",
    },

    partial: {
      label: "Deposit",
      className:
        "text-amber-600",
    },

    paid: {
      label: "Paid",
      className:
        "text-emerald-600",
    },
  } as const;


  const item =
    config[status] ??
    config.unpaid;


  return (
    <p
      className={`mt-1 text-[10px] font-medium ${item.className}`}
    >
      {item.label}
    </p>
  );
}


/* ============================================================
   EMPTY STATE
============================================================ */

function FilteredEmptyState({
  hasFilters,
}: {
  hasFilters: boolean;
}) {
  if (!hasFilters) {
    return <EmptyState />;
  }


  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">

      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <Search className="h-6 w-6" />
      </div>


      <h3 className="text-sm font-semibold text-neutral-950">
        No matching services
      </h3>


      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
        No services match your current
        search or status filter.
      </p>


      <Link
        href="/dashboard/services"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-medium text-white transition hover:bg-neutral-800"
      >
        Clear filters
      </Link>

    </div>
  );
}


/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">

      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <Package className="h-6 w-6" />
      </div>


      <h3 className="text-sm font-semibold text-neutral-950">
        No services yet
      </h3>


      <p className="mt-1 max-w-sm text-xs leading-5 text-neutral-400">
        Create the first laundry service
        to start managing today&apos;s
        operations.
      </p>


      <Link
        href="/dashboard/services/new"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-medium text-white transition hover:bg-neutral-800"
      >
        <Plus className="h-3.5 w-3.5" />

        Create service
      </Link>

    </div>
  );
}


/* ============================================================
   STATUS LABEL
============================================================ */

function getStatusLabel(
  status: Exclude<
    ServiceStatusFilter,
    "all"
  >,
) {
  switch (status) {
    case "pending":
      return "Pending";

    case "ready_for_collection":
      return "Ready";

    case "collected":
      return "Collected";

    default:
      return "All";
  }
}


/* ============================================================
   CURRENCY
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
   DATE
============================================================ */

function formatDate(
  value: string,
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(
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
   TIME
============================================================ */

function formatTime(
  value: string,
) {
  if (!value) {
    return "";
  }


  const [
    hours,
    minutes,
  ] = value.split(":");


  const date =
    new Date();


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


/* ============================================================
   FALLBACK SERVICE ID
============================================================ */

function shortServiceId(
  id: string,
) {
  return `#${id
    .slice(
      0,
      8,
    )
    .toUpperCase()}`;
}