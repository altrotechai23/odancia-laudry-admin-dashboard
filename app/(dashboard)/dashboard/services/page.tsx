import Link from "next/link";
import ServicesControls from "./ServicesControls";

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

type ServiceSort = "urgency" | "collection" | "express" | "newest";

type ServicesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
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

function parseServiceSort(value: string | undefined): ServiceSort {
  if (value === "collection" || value === "express" || value === "newest") return value;
  return "urgency";
}

function collectionDeadline(service: LaundryService): number | null {
  if (service.service_status === "collected") return null;

  if (service.is_express) {
    const expected = service.expected_completion_at ? Date.parse(service.expected_completion_at) : Number.NaN;
    if (Number.isFinite(expected)) return expected;
    const created = Date.parse(service.created_at);
    return Number.isFinite(created) ? created + 4 * 60 * 60 * 1000 : null;
  }

  if (!service.collection_date) return null;
  const time = service.collection_time ? service.collection_time.slice(0, 5) : "23:59";
  const due = Date.parse(`${service.collection_date}T${time}:00+02:00`);
  return Number.isFinite(due) ? due : null;
}

function sortServices(items: LaundryService[], sort: ServiceSort): LaundryService[] {
  return [...items].sort((left, right) => {
    if (sort === "newest") return Date.parse(right.created_at) - Date.parse(left.created_at);

    const leftDone = left.service_status === "collected";
    const rightDone = right.service_status === "collected";
    if (leftDone !== rightDone) return leftDone ? 1 : -1;

    if (sort === "express" && left.is_express !== right.is_express) return left.is_express ? -1 : 1;

    let leftDeadline: number | null;
    let rightDeadline: number | null;
    if (sort === "collection") {
      leftDeadline = left.collection_date ? Date.parse(`${left.collection_date}T${(left.collection_time ?? "23:59").slice(0, 5)}:00+02:00`) : null;
      rightDeadline = right.collection_date ? Date.parse(`${right.collection_date}T${(right.collection_time ?? "23:59").slice(0, 5)}:00+02:00`) : null;
    } else {
      leftDeadline = collectionDeadline(left);
      rightDeadline = collectionDeadline(right);
    }

    if (leftDeadline !== null && rightDeadline !== null && leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
    if (leftDeadline !== null && rightDeadline === null) return -1;
    if (leftDeadline === null && rightDeadline !== null) return 1;
    if (sort === "urgency" && left.is_express !== right.is_express) return left.is_express ? -1 : 1;
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
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
  const sort = parseServiceSort(params.sort);

  const { services: allServices, asOf } = await getServices();


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

  // Default view prioritizes the nearest service deadline (express jobs use their 4-hour target).
  services = sortServices(services, sort);

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
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-900 active:scale-[0.98]"
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

        <section className="odancia-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

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

          <ServicesControls
            key={`${query}|${status}|${sort}`}
            query={query}
            status={status}
            sort={sort}
          />


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

              <div className="hidden overflow-x-auto xl:block">

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
                        Collection / urgency
                      </TableHeader>

                      <TableHeader>
                        Staff
                      </TableHeader>

                    </tr>

                  </thead>


                  <tbody className="odancia-stagger">

                    {services.map(
                      (service) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                          asOf={asOf}
                        />
                      ),
                    )}

                  </tbody>

                </table>

              </div>


              {/* ==================================================
                  MOBILE
              ================================================== */}

              <div className="odancia-stagger grid gap-3 p-3 sm:grid-cols-2 xl:hidden">

                {services.map(
                  (service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      asOf={asOf}
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
      className={`odancia-interactive-card rounded-2xl border px-5 py-4 transition ${
        emphasis
          ? "border-neutral-950 bg-blue-800 text-white"
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

function ServiceCellLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="-mx-5 -my-4 block h-full min-h-full px-5 py-4 outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 group-hover:text-blue-950"
    >
      {children}
    </Link>
  );
}

function UrgencyFlag({ service, asOf }: { service: LaundryService; asOf: number }) {
  if (service.service_status === "collected") return null;
  const due = collectionDeadline(service);
  if (due === null) {
    return <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">Schedule needed</span>;
  }
  const difference = due - asOf;
  if (difference < 0) {
    return <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-800">Overdue</span>;
  }
  if (service.is_express) {
    return <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">Express deadline</span>;
  }
  if (difference <= 24 * 60 * 60 * 1000) {
    return <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">Due within 24h</span>;
  }
  return null;
}

function paymentMethodLabel(method: string) {
  switch (method.toLowerCase()) {
    case "cash": return "Cash";
    case "eft": return "EFT";
    case "card": return "Card";
    default: return "Other";
  }
}

function ServiceRow({ service, asOf }: { service: LaundryService; asOf: number }) {
  const href = `/dashboard/services/${service.id}`;
  return (
    <tr className="odancia-service-row group border-b border-black/[0.05] transition-colors hover:bg-blue-50/60 active:bg-blue-50">
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <div className="font-semibold text-neutral-950">
            {service.service_number ?? shortServiceId(service.id)}
          </div>
          {service.is_express && <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">Express</span>}
          <UrgencyFlag service={service} asOf={asOf} />
          <p className="mt-1 text-[11px] text-neutral-400">{formatDate(service.service_date)}{service.service_time ? ` · ${formatTime(service.service_time)}` : ""}</p>
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><UserRound className="h-4 w-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-950">{service.client_name}</p><p className="mt-0.5 text-[11px] text-neutral-400">{service.phone}</p></div>
          </div>
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <p className="text-sm text-neutral-700">{service.service_type_name ?? "Laundry service"}</p>
          {service.number_of_items && <p className="mt-1 text-[11px] text-neutral-400">{service.number_of_items} {service.number_of_items === 1 ? "item" : "items"}</p>}
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <p className="text-sm font-semibold text-neutral-950">{formatCurrency(service.price)}</p>
          {service.deposit > 0 && <p className="mt-1 text-[11px] text-neutral-400">Deposit {formatCurrency(service.deposit)}</p>}
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <p className={`text-sm font-bold ${service.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>{formatCurrency(service.balance)}</p>
          <p className="mt-1 text-[10px] font-medium text-neutral-400">{service.payment_status === "paid" ? "Paid" : service.payment_status === "partial" ? "Partially paid" : "Unpaid"}</p>
          {service.payment_history.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2">
              {service.payment_history.map((payment) => (
                <div key={payment.id} className="flex min-w-[150px] items-start justify-between gap-3 text-[10px] leading-4">
                  <span className="min-w-0"><span className="font-semibold text-blue-800">{paymentMethodLabel(payment.payment_method)}</span>{payment.received_by_name && <span className="block truncate text-neutral-400">By {payment.received_by_name}</span>}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-neutral-700">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-2 border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">No payments yet</p>}
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top"><ServiceCellLink href={href}><StatusBadge status={service.service_status} /></ServiceCellLink></td>
      <td className="px-5 py-4 align-top">
        <ServiceCellLink href={href}>
          <div className="min-w-[150px] rounded-xl border border-red-100 bg-red-50/70 px-3 py-2.5 shadow-sm shadow-red-900/[0.02]">
            <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-red-700">
              {service.fulfillment_method === "delivery" ? <Truck className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
              Collection due
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-blue-950">{service.collection_date ? formatDate(service.collection_date) : "Date not set"}</p>
            <p className="mt-0.5 text-xs font-bold text-red-700">{service.collection_time ? formatTime(service.collection_time) : "Time not recorded"}</p>
            <p className="mt-1 text-[10px] font-medium text-slate-500">{service.fulfillment_method === "delivery" ? "Delivery" : "Pickup"}</p>
          </div>
        </ServiceCellLink>
      </td>
      <td className="px-5 py-4 align-top"><ServiceCellLink href={href}><p className="text-xs text-neutral-600">{service.staff_name ?? "—"}</p></ServiceCellLink></td>
    </tr>
  );
}

/* ============================================================
   RESPONSIVE SERVICE CARD — the full card is a tablet-friendly link
============================================================ */
function ServiceCard({ service, asOf }: { service: LaundryService; asOf: number }) {
  return (
    <Link
      href={`/dashboard/services/${service.id}`}
      aria-label={`Open service ${service.service_number ?? shortServiceId(service.id)} for ${service.client_name}`}
      className="odancia-interactive-card group block min-h-full rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.995] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><UserRound className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-blue-800">{service.service_number ?? shortServiceId(service.id)}</p>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-950">{service.client_name}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-500">{service.phone || "No phone number"}</p>
          </div>
        </div>
        <StatusBadge status={service.service_status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">{service.service_type_name ?? "Laundry service"}</span>
        {service.is_express && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">Express</span>}
        <UrgencyFlag service={service} asOf={asOf} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <MobileDetail label="Total" value={formatCurrency(service.price)} />
        <MobileDetail label="Balance" value={formatCurrency(service.balance)} highlight={service.balance > 0} />
        <div className="rounded-xl border border-red-100 bg-red-50/70 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-red-700">Collection date</p><p className="mt-1.5 text-sm font-extrabold text-blue-950">{service.collection_date ? formatDate(service.collection_date) : "Date not set"}</p><p className="mt-1 text-xs font-bold text-red-700">{service.collection_time ? formatTime(service.collection_time) : "Collection time not recorded"}</p></div>
        <MobileDetail label="Received by" value={service.staff_name ?? "Not recorded"} />
      </div>
      <div className="mt-3 rounded-xl border border-neutral-100 bg-slate-50/80 p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Payments so far</p><p className="text-[10px] font-semibold text-neutral-700">{formatCurrency(service.amount_paid)}</p></div>
        {service.payment_history.length ? <div className="space-y-2">{service.payment_history.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0"><span className="font-semibold text-blue-800">{paymentMethodLabel(payment.payment_method)}</span><span className="ml-2 text-[10px] text-neutral-500">{payment.received_by_name ?? "Operator not recorded"}</span></span><span className="shrink-0 font-semibold tabular-nums text-neutral-800">{formatCurrency(payment.amount)}</span></div>)}</div> : <p className="text-xs text-neutral-400">No payments recorded yet.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-400"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(service.service_date)}</span><span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">Open details <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span></div>
    </Link>
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
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-medium text-white transition hover:bg-blue-900"
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
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-medium text-white transition hover:bg-blue-900"
      >
        <Plus className="h-3.5 w-3.5" />

        Create service
      </Link>

    </div>
  );
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