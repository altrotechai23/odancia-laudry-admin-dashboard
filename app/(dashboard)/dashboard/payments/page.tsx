import Link from "next/link";

import {
  ArrowDownLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  Phone,
  Search,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

import type {
  PaymentRecord,
  PaymentSummary,
} from "./types";

/* ============================================================
   PAGE PROPS
============================================================ */

type PaymentsPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

/* ============================================================
   PAGE
============================================================ */

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requireOwnerOrAdmin();

  const params = await searchParams;

  const search =
    params.q?.trim() ?? "";

  const status =
    normalizePaymentStatus(
      params.status,
    );

  const {
    payments,
    summary,
  } = await getPayments(
    search,
    status,
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">

        {/* ====================================================
           HEADER
        ==================================================== */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Operations</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Payments</span>
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Payments
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Track customer payments, deposits,
                outstanding balances, and laundry
                service revenue.
              </p>

            </div>

          </div>
        </header>

        {/* ====================================================
           SUMMARY
        ==================================================== */}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            icon={
              <WalletCards className="h-4 w-4" />
            }
            label="Total revenue"
            value={formatCurrency(
              summary.totalRevenue,
            )}
            description={`${summary.totalCount} services`}
            valueIsText
          />

          <SummaryCard
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Amount paid"
            value={formatCurrency(
              summary.totalPaid,
            )}
            description={`${summary.paidCount} paid`}
            valueIsText
          />

          <SummaryCard
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Outstanding"
            value={formatCurrency(
              summary.totalOutstanding,
            )}
            description={`${summary.partialCount + summary.unpaidCount} requiring payment`}
            valueIsText
          />

          <SummaryCard
            icon={
              <ArrowDownLeft className="h-4 w-4" />
            }
            label="Deposits"
            value={formatCurrency(
              summary.totalDeposits,
            )}
            description={`${summary.partialCount} deposit payments`}
            valueIsText
          />

        </section>

        {/* ====================================================
           PAYMENT STATUS BREAKDOWN
        ==================================================== */}

        <section className="mt-5 grid gap-3 sm:grid-cols-3">

          <StatusSummaryCard
            icon={
              <CheckCircle2 className="h-4 w-4" />
            }
            label="Paid"
            value={summary.paidCount}
            description="Fully paid services"
            tone="green"
          />

          <StatusSummaryCard
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Partial"
            value={summary.partialCount}
            description="Deposit or partial payment"
            tone="amber"
          />

          <StatusSummaryCard
            icon={
              <XCircle className="h-4 w-4" />
            }
            label="Unpaid"
            value={summary.unpaidCount}
            description="No payment recorded"
            tone="red"
          />

        </section>

        {/* ====================================================
           PAYMENT DIRECTORY
        ==================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          {/* ==================================================
             TOOLBAR
          ================================================== */}

          <div className="border-b border-black/[0.06] px-5 py-4 sm:px-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <h2 className="text-sm font-semibold text-neutral-950">
                  Payment records
                </h2>

                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Financial activity across laundry services
                </p>

              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                {/* SEARCH */}

                <form
                  method="GET"
                  className="w-full sm:w-[280px]"
                >

                  {status ? (
                    <input
                      type="hidden"
                      name="status"
                      value={status}
                    />
                  ) : null}

                  <div className="relative">

                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />

                    <input
                      type="search"
                      name="q"
                      defaultValue={search}
                      placeholder="Search payments..."
                      className="h-10 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-9 pr-3 text-xs text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
                    />

                  </div>

                </form>

                {/* STATUS FILTER */}

                <StatusFilter
                  currentStatus={status}
                  search={search}
                />

              </div>

            </div>

          </div>

          {/* ==================================================
             EMPTY
          ================================================== */}

          {payments.length === 0 ? (
            <EmptyPayments
              search={search}
              status={status}
            />
          ) : (
            <>
              {/* =================================================
                 DESKTOP
              ================================================= */}

              <div className="hidden overflow-x-auto sm:block">

                <table className="w-full min-w-[1050px]">

                  <thead>

                    <tr className="border-b border-black/[0.05] bg-neutral-50/70 text-left">

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Service
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Total
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Paid
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Balance
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400">
                        Date
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-black/[0.05]">

                    {payments.map(
                      (payment) => (
                        <PaymentRow
                          key={payment.id}
                          payment={payment}
                        />
                      ),
                    )}

                  </tbody>

                </table>

              </div>

              {/* =================================================
                 MOBILE
              ================================================= */}

              <div className="divide-y divide-black/[0.05] sm:hidden">

                {payments.map(
                  (payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                    />
                  ),
                )}

              </div>
            </>
          )}

        </section>

        {/* ====================================================
           FOOTER
        ==================================================== */}

        <div className="mt-5 flex flex-col gap-1 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">

          <p>
            {payments.length}{" "}
            {payments.length === 1
              ? "payment"
              : "payments"}{" "}
            shown
            {search
              ? ` for "${search}"`
              : ""}
          </p>

          <p>
            Payment information is managed securely
            through Supabase.
          </p>

        </div>

      </div>
    </main>
  );
}

/* ============================================================
   DATA
============================================================ */

async function getPayments(
  search: string,
  status: string | null,
): Promise<{
  payments: PaymentRecord[];
  summary: PaymentSummary;
}> {
  const supabase =
    await createClient();

  let query = supabase
    .from("services")
    .select(`
      id,
      service_number,
      service_date,
      total_price,
      deposit_amount,
      amount_paid,
      balance,
      payment_status,
      service_status,
      created_at,
      updated_at,

      clients (
        id,
        full_name,
        phone,
        email
      ),

      service_types (
        id,
        name
      )
    `);

  /* ==========================================================
     PAYMENT STATUS
  ========================================================== */

  if (status) {
    query = query.eq(
      "payment_status",
      status,
    );
  }

  /* ==========================================================
     SEARCH
  ========================================================== */

  if (search) {
    const escapedSearch =
      escapePostgrestSearch(
        search,
      );

    /*
     * Search directly on the service table.
     *
     * Client-name search is handled after
     * fetching because Supabase relationship
     * filters have different semantics.
     */
    query = query.or(
      [
        `service_number.ilike.%${escapedSearch}%`,
        `payment_status.ilike.%${escapedSearch}%`,
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
      "PAYMENTS LOAD FAILED:",
      error,
    );

    return {
      payments: [],
      summary: emptySummary(),
    };
  }

  /*
   * Supabase relationship results can be
   * arrays depending on the detected relationship.
   *
   * Normalize them into the shape our UI expects.
   */

  const rawPayments =
    (data ?? []) as unknown as RawPaymentRecord[];

  let payments =
    rawPayments.map(
      normalizePayment,
    );

  /*
   * Client name/email/phone search.
   *
   * This is intentionally performed after
   * normalization so the query remains reliable
   * regardless of the relationship shape.
   */

  if (search) {
    const normalizedSearch =
      search.toLowerCase();

    payments =
      payments.filter(
        (payment) => {

          const serviceNumber =
            payment.service_number
              ?.toLowerCase() ?? "";

          const clientName =
            payment.client
              ?.full_name
              ?.toLowerCase() ?? "";

          const phone =
            payment.client?.phone
              ?.toLowerCase() ?? "";

          const email =
            payment.client?.email
              ?.toLowerCase() ?? "";

          const serviceType =
            payment.service_type
              ?.name
              ?.toLowerCase() ?? "";

          return (
            serviceNumber.includes(
              normalizedSearch,
            ) ||
            clientName.includes(
              normalizedSearch,
            ) ||
            phone.includes(
              normalizedSearch,
            ) ||
            email.includes(
              normalizedSearch,
            ) ||
            serviceType.includes(
              normalizedSearch,
            ) ||
            payment.payment_status
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              )
          );
        },
      );
  }

  return {
    payments,
    summary:
      buildPaymentSummary(
        payments,
      ),
  };
}

/* ============================================================
   RAW SUPABASE TYPE
============================================================ */

type RawPaymentRecord = {
  id: string;
  service_number: string | null;
  service_date: string | null;

  total_price: number | null;
  deposit_amount: number | null;
  amount_paid: number | null;
  balance: number | null;

  payment_status: string | null;
  service_status: string | null;

  created_at: string;
  updated_at: string;

  clients:
    | {
        id: string;
        full_name: string;
        phone: string | null;
        email: string | null;
      }
    | {
        id: string;
        full_name: string;
        phone: string | null;
        email: string | null;
      }[]
    | null;

  service_types:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

/* ============================================================
   NORMALIZE PAYMENT
============================================================ */

function normalizePayment(
  payment: RawPaymentRecord,
): PaymentRecord {
  return {
    id: payment.id,

    service_number:
      payment.service_number,

    service_date:
      payment.service_date,

    total_price:
      payment.total_price,

    deposit_amount:
      payment.deposit_amount,

    amount_paid:
      payment.amount_paid,

    balance:
      payment.balance,

    payment_status:
      payment.payment_status,

    service_status:
      payment.service_status,

    created_at:
      payment.created_at,

    updated_at:
      payment.updated_at,

    client:
      Array.isArray(
        payment.clients,
      )
        ? payment.clients[0] ??
          null
        : payment.clients ?? null,

    service_type:
      Array.isArray(
        payment.service_types,
      )
        ? payment.service_types[0] ??
          null
        : payment.service_types ??
          null,
  };
}

/* ============================================================
   SUMMARY
============================================================ */

function buildPaymentSummary(
  payments: PaymentRecord[],
): PaymentSummary {
  return payments.reduce(
    (summary, payment) => {

      const total =
        Number(
          payment.total_price ?? 0,
        );

      const paid =
        Number(
          payment.amount_paid ?? 0,
        );

      const balance =
        Number(
          payment.balance ?? 0,
        );

      const deposit =
        Number(
          payment.deposit_amount ?? 0,
        );

      summary.totalCount += 1;

      summary.totalRevenue +=
        total;

      summary.totalPaid +=
        paid;

      summary.totalOutstanding +=
        Math.max(balance, 0);

      summary.totalDeposits +=
        deposit;

      switch (
        payment.payment_status
      ) {
        case "paid":
          summary.paidCount += 1;
          break;

        case "partial":
          summary.partialCount += 1;
          break;

        case "unpaid":
        default:
          summary.unpaidCount += 1;
          break;
      }

      return summary;
    },
    emptySummary(),
  );
}

/* ============================================================
   EMPTY SUMMARY
============================================================ */

function emptySummary(): PaymentSummary {
  return {
    totalRevenue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalDeposits: 0,

    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
    totalCount: 0,
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
  valueIsText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
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

      <p className="mt-1 text-[11px] text-neutral-400">
        {description}
      </p>

    </div>
  );
}

/* ============================================================
   STATUS SUMMARY CARD
============================================================ */

function StatusSummaryCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  tone:
    | "green"
    | "amber"
    | "red";
}) {
  const toneClasses = {
    green:
      "bg-emerald-50 text-emerald-600",

    amber:
      "bg-amber-50 text-amber-600",

    red:
      "bg-red-50 text-red-500",
  };

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">

      <div className="flex items-start justify-between gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
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
   STATUS FILTER
============================================================ */

function StatusFilter({
  currentStatus,
  search,
}: {
  currentStatus: string | null;
  search: string;
}) {
  return (
    <div className="flex h-10 overflow-hidden rounded-xl border border-black/[0.07] bg-neutral-50">

      <FilterLink
        href={buildFilterUrl(
          search,
          null,
        )}
        active={!currentStatus}
      >
        All
      </FilterLink>

      <FilterLink
        href={buildFilterUrl(
          search,
          "paid",
        )}
        active={
          currentStatus === "paid"
        }
      >
        Paid
      </FilterLink>

      <FilterLink
        href={buildFilterUrl(
          search,
          "partial",
        )}
        active={
          currentStatus ===
          "partial"
        }
      >
        Partial
      </FilterLink>

      <FilterLink
        href={buildFilterUrl(
          search,
          "unpaid",
        )}
        active={
          currentStatus ===
          "unpaid"
        }
      >
        Unpaid
      </FilterLink>

    </div>
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
      className={
        active
          ? "inline-flex items-center justify-center bg-blue-800 px-3 text-[11px] font-semibold text-white"
          : "inline-flex items-center justify-center px-3 text-[11px] font-medium text-neutral-500 transition hover:bg-white hover:text-neutral-950"
      }
    >
      {children}
    </Link>
  );
}

/* ============================================================
   PAYMENT ROW
============================================================ */

function PaymentRow({
  payment,
}: {
  payment: PaymentRecord;
}) {
  return (
    <tr className="transition hover:bg-neutral-50/60">

      {/* CUSTOMER */}

      <td className="px-5 py-4">

        <Link
          href={
            payment.client
              ? `/dashboard/clients/${payment.client.id}`
              : "#"
          }
          className="flex min-w-0 items-center gap-3"
        >

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <UserRound className="h-4 w-4" />
          </div>

          <div className="min-w-0">

            <p className="truncate text-xs font-semibold text-neutral-950">
              {payment.client
                ?.full_name ??
                "Unknown client"}
            </p>

            {payment.client?.phone ? (
              <p className="mt-1 truncate text-[10px] text-neutral-400">
                {payment.client.phone}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-neutral-400">
                No phone
              </p>
            )}

          </div>

        </Link>

      </td>

      {/* SERVICE */}

      <td className="px-5 py-4">

        <p className="text-xs font-semibold text-neutral-950">
          {payment.service_type
            ?.name ??
            "Laundry service"}
        </p>

        <p className="mt-1 font-mono text-[10px] text-neutral-400">
          {payment.service_number ??
            `#${payment.id
              .slice(0, 8)
              .toUpperCase()}`}
        </p>

      </td>

      {/* TOTAL */}

      <td className="px-5 py-4">

        <p className="text-xs font-semibold text-neutral-950">
          {formatCurrency(
            Number(
              payment.total_price ??
                0,
            ),
          )}
        </p>

      </td>

      {/* PAID */}

      <td className="px-5 py-4">

        <p className="text-xs font-semibold text-emerald-600">
          {formatCurrency(
            Number(
              payment.amount_paid ??
                0,
            ),
          )}
        </p>

        {Number(
          payment.deposit_amount ??
            0,
        ) > 0 ? (
          <p className="mt-1 text-[10px] text-neutral-400">
            Deposit{" "}
            {formatCurrency(
              Number(
                payment.deposit_amount ??
                  0,
              ),
            )}
          </p>
        ) : null}

      </td>

      {/* BALANCE */}

      <td className="px-5 py-4">

        <p
          className={
            Number(
              payment.balance ??
                0,
            ) > 0
              ? "text-xs font-semibold text-red-500"
              : "text-xs font-semibold text-neutral-500"
          }
        >
          {formatCurrency(
            Number(
              payment.balance ??
                0,
            ),
          )}
        </p>

      </td>

      {/* STATUS */}

      <td className="px-5 py-4">

        <PaymentStatusBadge
          status={
            payment.payment_status
          }
        />

      </td>

      {/* DATE */}

      <td className="px-5 py-4">

        <p className="text-xs text-neutral-600">
          {formatDate(
            payment.service_date,
          )}
        </p>

      </td>

    </tr>
  );
}

/* ============================================================
   MOBILE PAYMENT CARD
============================================================ */

function PaymentCard({
  payment,
}: {
  payment: PaymentRecord;
}) {
  return (
    <div className="p-5">

      {/* TOP */}

      <div className="flex items-start justify-between gap-4">

        <Link
          href={
            payment.client
              ? `/dashboard/clients/${payment.client.id}`
              : "#"
          }
          className="flex min-w-0 items-center gap-3"
        >

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <UserRound className="h-4 w-4" />
          </div>

          <div className="min-w-0">

            <p className="truncate text-sm font-semibold text-neutral-950">
              {payment.client
                ?.full_name ??
                "Unknown client"}
            </p>

            <p className="mt-1 font-mono text-[10px] text-neutral-400">
              {payment.service_number ??
                `#${payment.id
                  .slice(0, 8)
                  .toUpperCase()}`}
            </p>

          </div>

        </Link>

        <PaymentStatusBadge
          status={
            payment.payment_status
          }
        />

      </div>

      {/* SERVICE */}

      <div className="mt-4 rounded-xl bg-neutral-50 p-3">

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
          Service
        </p>

        <p className="mt-1 text-xs font-semibold text-neutral-950">
          {payment.service_type
            ?.name ??
            "Laundry service"}
        </p>

      </div>

      {/* AMOUNTS */}

      <div className="mt-3 grid grid-cols-2 gap-3">

        <MobileAmount
          label="Total"
          value={formatCurrency(
            Number(
              payment.total_price ??
                0,
            ),
          )}
        />

        <MobileAmount
          label="Paid"
          value={formatCurrency(
            Number(
              payment.amount_paid ??
                0,
            ),
          )}
          tone="green"
        />

        <MobileAmount
          label="Balance"
          value={formatCurrency(
            Number(
              payment.balance ??
                0,
            ),
          )}
          tone={
            Number(
              payment.balance ??
                0,
            ) > 0
              ? "red"
              : "neutral"
          }
        />

        <MobileAmount
          label="Date"
          value={formatDate(
            payment.service_date,
          )}
        />

      </div>

      {/* CONTACT */}

      {payment.client ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-black/[0.05] pt-4">

          {payment.client.phone ? (
            <a
              href={`tel:${payment.client.phone}`}
              className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 transition hover:text-neutral-950"
            >
              <Phone className="h-3 w-3" />
              {payment.client.phone}
            </a>
          ) : null}

          {payment.client.email ? (
            <a
              href={`mailto:${payment.client.email}`}
              className="inline-flex max-w-full items-center gap-1.5 text-[11px] text-neutral-500 transition hover:text-neutral-950"
            >
              <Mail className="h-3 w-3 shrink-0" />

              <span className="truncate">
                {payment.client.email}
              </span>
            </a>
          ) : null}

        </div>
      ) : null}

    </div>
  );
}

/* ============================================================
   MOBILE AMOUNT
============================================================ */

function MobileAmount({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?:
    | "neutral"
    | "green"
    | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-500"
        : "text-neutral-950";

  return (
    <div className="rounded-xl bg-neutral-50 p-3">

      <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs font-semibold ${toneClass}`}
      >
        {value}
      </p>

    </div>
  );
}

/* ============================================================
   PAYMENT STATUS BADGE
============================================================ */

function PaymentStatusBadge({
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
    paid: {
      label: "Paid",
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    },

    partial: {
      label: "Partial",
      className:
        "bg-amber-50 text-amber-700 ring-amber-600/10",
    },

    unpaid: {
      label: "Unpaid",
      className:
        "bg-red-50 text-red-600 ring-red-600/10",
    },
  };

  const item =
    config[
      status ?? "unpaid"
    ] ?? config.unpaid;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}

/* ============================================================
   EMPTY PAYMENTS
============================================================ */

function EmptyPayments({
  search,
  status,
}: {
  search: string;
  status: string | null;
}) {
  const hasFilters =
    Boolean(search) ||
    Boolean(status);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">

        {hasFilters ? (
          <XCircle className="h-6 w-6" />
        ) : (
          <CreditCard className="h-6 w-6" />
        )}

      </div>

      <h3 className="mt-5 text-sm font-semibold text-neutral-950">
        {hasFilters
          ? "No payments found"
          : "No payment records yet"}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-neutral-400">

        {hasFilters
          ? "No payment records matched your current search or status filter."
          : "Payment activity will appear here once laundry services are registered."}

      </p>

      {hasFilters ? (
        <Link
          href="/dashboard/payments"
          className="mt-5 inline-flex h-10 items-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Clear filters
        </Link>
      ) : null}

    </div>
  );
}

/* ============================================================
   PAYMENT STATUS NORMALIZER
============================================================ */

function normalizePaymentStatus(
  value:
    | string
    | undefined,
): string | null {
  if (
    value === "paid" ||
    value === "partial" ||
    value === "unpaid"
  ) {
    return value;
  }

  return null;
}

/* ============================================================
   SEARCH ESCAPING
============================================================ */

function escapePostgrestSearch(
  value: string,
) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,");
}

/* ============================================================
   FILTER URL
============================================================ */

function buildFilterUrl(
  search: string,
  status: string | null,
) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set("q", search);
  }

  if (status) {
    params.set(
      "status",
      status,
    );
  }

  const query =
    params.toString();

  return query
    ? `/dashboard/payments?${query}`
    : "/dashboard/payments";
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