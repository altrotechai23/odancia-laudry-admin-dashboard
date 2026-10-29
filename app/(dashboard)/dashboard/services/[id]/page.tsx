import Link from "next/link";

import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Package,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import ServiceActions from "./ServiceActions";
import ServicePayment from "./ServicePayment";
import CollectionScheduleEditor from "./CollectionScheduleEditor";
import {
  requireUser,
} from "@/lib/auth/get-current-user";

import {
  getService,
  type LaundryService,
} from "@/lib/services/get-services";


type ServiceDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};


export default async function ServiceDetailsPage({
  params,
}: ServiceDetailsPageProps) {
  await requireUser();

  const { id } =
    await params;

  const service =
    await getService(id);

  if (!service) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">

          <Link
            href="/dashboard/services"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to services
          </Link>

          <div className="mt-10 rounded-3xl border border-black/[0.06] bg-white px-6 py-16 text-center shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              <Package className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-lg font-semibold text-neutral-950">
              Service not found
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-400">
              This service may have been removed
              or you may not have permission to
              view it.
            </p>

            <Link
              href="/dashboard/services"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-800 px-4 text-xs font-medium text-white transition hover:bg-blue-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />

              Back to services
            </Link>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">

        {/* ==================================================
            BACK
        ================================================== */}

        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to services
        </Link>


        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mt-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">

                <span>
                  Operations
                </span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>
                  Service
                </span>

              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">

                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                  {service.service_number ??
                    shortServiceId(service.id)}
                </h1>

                <StatusBadge
                  status={
                    service.service_status
                  }
                />
                {service.is_express && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Express · 2–4 hours
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm text-neutral-500">
                Created{" "}
                {formatDateTime(
                  service.created_at,
                )}
              </p>

            </div>


            <div className="flex shrink-0 gap-2">

              <Link
                href="/dashboard/services"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                All services
              </Link>

            </div>

          </div>

        </header>


        {/* ==================================================
            MAIN GRID
        ================================================== */}

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_360px]">

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="space-y-5">

            {/* Customer */}

            <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

              <SectionHeader
                icon={
                  <UserRound className="h-4 w-4" />
                }
                title="Customer"
                description="Customer information"
              />

              <div className="p-5 sm:p-6">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">

                    <p className="text-base font-semibold text-neutral-950">
                      {service.client_name}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">

                      <a
                        href={`tel:${service.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-neutral-950"
                      >
                        <Phone className="h-3 w-3" />

                        {service.phone ||
                          "No phone number"}
                      </a>

                      {service.email && (
                        <a
                          href={`mailto:${service.email}`}
                          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition hover:text-neutral-950"
                        >
                          <Mail className="h-3 w-3" />

                          {service.email}
                        </a>
                      )}

                    </div>

                  </div>

                </div>

              </div>

            </section>


            {/* Service */}

            <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

              <SectionHeader
                icon={
                  <Package className="h-4 w-4" />
                }
                title="Service"
                description="Laundry service details"
              />

              <div className="grid gap-px bg-black/[0.05] sm:grid-cols-2">

                <DetailBlock
                  label="Service type"
                  value={
                    service.service_type_name ??
                    "Laundry service"
                  }
                />

                <DetailBlock
                  label="Agreed base price"
                  value={formatCurrency(service.base_price)}
                />

                {service.is_express && (
                  <DetailBlock
                    label="Express completion window"
                    value={
                      service.expected_completion_at
                        ? `${formatDateTime(service.express_earliest_at ?? service.expected_completion_at)} – ${formatDateTime(service.expected_completion_at)}`
                        : "2–4 hours from service creation"
                    }
                  />
                )}

                <DetailBlock
                  label="Number of items"
                  value={
                    service.number_of_items
                      ? `${service.number_of_items} ${
                          service.number_of_items === 1
                            ? "item"
                            : "items"
                        }`
                      : "Not specified"
                  }
                />

                <DetailBlock
                  label="Service date"
                  value={formatDate(
                    service.service_date,
                  )}
                  icon={
                    <CalendarDays className="h-3.5 w-3.5" />
                  }
                />

                <DetailBlock
                  label="Service time"
                  value={
                    service.service_time
                      ? formatTime(
                          service.service_time,
                        )
                      : "Not specified"
                  }
                  icon={
                    <Clock3 className="h-3.5 w-3.5" />
                  }
                />

                <DetailBlock
                  label="Collection date"
                  value={
                    service.collection_date
                      ? formatDate(service.collection_date)
                      : "Not recorded"
                  }
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  tone="blue"
                />

                <DetailBlock
                  label="Collection time"
                  value={
                    service.collection_time
                      ? formatTime(service.collection_time)
                      : "Not recorded"
                  }
                  icon={<Clock3 className="h-3.5 w-3.5" />}
                  tone="red"
                />

              </div>

            </section>


            {/* Notes */}

            {service.notes && (
              <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

                <SectionHeader
                  icon={
                    <Package className="h-4 w-4" />
                  }
                  title="Notes"
                  description="Additional service information"
                />

                <div className="p-5 sm:p-6">

                  <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-600">
                    {service.notes}
                  </p>

                </div>

              </section>
            )}

          </div>


          {/* ==================================================
              RIGHT
          ================================================== */}

          <div className="space-y-5">
            {/* Operations */}

<section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

  <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 sm:px-6">

    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white">
      <Clock3 className="h-4 w-4" />
    </div>

    <div>
      <h2 className="text-sm font-semibold text-neutral-950">
        Operations
      </h2>

      <p className="mt-0.5 text-[11px] text-neutral-400">
        Update service progress
      </p>
    </div>

  </div>

  <div className="p-5">

    <ServiceActions
      serviceId={service.id}
      status={service.service_status}
    />

  </div>

</section>

            {/* Payment */}

            {/* Payment */}

<section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
  <SectionHeader
    icon={
      <Banknote className="h-4 w-4" />
    }
    title="Payment"
    description="Payment summary"
  />

  <div className="p-5">
    <ServicePayment
      serviceId={service.id}
      total={service.price}
      amountPaid={
        service.amount_paid
      }
      serviceTypeName={service.service_type_name}
      paymentHistory={service.payment_history}
    />
  </div>
</section>


            {/* Collection */}

            <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

              <SectionHeader
                icon={
                  service.fulfillment_method ===
                  "delivery" ? (
                    <Truck className="h-4 w-4" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )
                }
                title="Collection"
                description="Pickup or delivery"
              />

              <div className="p-5">

                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">

                    {service.fulfillment_method ===
                    "delivery" ? (
                      <Truck className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}

                  </div>

                  <div>

                    <p className="text-base font-extrabold text-blue-950">
                      {service.collection_date
                        ? formatDate(service.collection_date)
                        : "Collection date not set"}
                    </p>
                    <p className="mt-1.5 text-sm font-bold text-red-700">
                      {service.collection_time
                        ? formatTime(service.collection_time)
                        : "Collection time not recorded"}
                    </p>
                    <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                      {service.fulfillment_method === "delivery" ? "Delivery" : "Customer pickup"}
                    </p>

                  </div>

                </div>

                <CollectionScheduleEditor
                  serviceId={service.id}
                  collectionDate={service.collection_date}
                  collectionTime={service.collection_time}
                />

              </div>

            </section>


            {/* Staff */}

            <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

              <SectionHeader
                icon={
                  <UserRound className="h-4 w-4" />
                }
                title="Staff"
                description="Service created by"
              />

              <div className="p-5">

                <p className="text-sm font-medium text-neutral-950">
                  {service.staff_name ??
                    "Unknown staff member"}
                </p>

                {service.staff_id && (
                  <p className="mt-1 truncate text-xs text-neutral-400">
                    {service.staff_id}
                  </p>
                )}

              </div>

            </section>

          </div>

        </div>


        {/* ==================================================
            FOOTER META
        ================================================== */}

        <div className="mt-6 flex flex-col gap-1 border-t border-black/[0.06] py-5 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">

          <p>
            Service ID:{" "}
            <span className="font-mono text-neutral-500">
              {service.id}
            </span>
          </p>

          <p>
            Updated{" "}
            {formatDateTime(
              service.updated_at,
            )}
          </p>

        </div>

      </div>
    </main>
  );
}


/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4 sm:px-6">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white">
        {icon}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-950">
          {title}
        </h2>

        <p className="mt-0.5 text-[11px] text-neutral-400">
          {description}
        </p>
      </div>

    </div>
  );
}


/* ============================================================
   DETAIL BLOCK
============================================================ */

function DetailBlock({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "default" | "blue" | "red";
}) {
  const labelTone = tone === "red" ? "text-red-700" : tone === "blue" ? "text-blue-800" : "text-neutral-400";
  const valueTone = tone === "red" ? "text-red-800" : tone === "blue" ? "text-blue-950" : "text-neutral-900";
  return (
    <div className="bg-white p-5">

      <p className={`text-[10px] font-semibold uppercase tracking-[0.13em] ${labelTone}`}>
        {label}
      </p>

      <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${valueTone}`}>
        {icon && (
          <span className="text-neutral-400">
            {icon}
          </span>
        )}

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
    new Date(`${value}T00:00:00`);

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
   DATE + TIME
============================================================ */

function formatDateTime(
  value: string,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
      hour: "numeric",
      minute: "2-digit",
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
    .slice(0, 8)
    .toUpperCase()}`;
}