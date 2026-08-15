import Link from "next/link";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  FilePlus2,
  FilePenLine,
  FileX2,
  UserRound,
} from "lucide-react";

import {
  getAuditLogs,
  type AuditAction,
  type AuditLog,
} from "@/lib/activity/get-audit-logs";

import {
  requireOwnerOrAdmin,
} from "@/lib/auth/get-current-user";


/* ============================================================
   PAGE TYPES
============================================================ */

type ActivityPageProps = {
  searchParams: Promise<{
    q?: string;

    action?: string;

    page?: string;
  }>;
};


/* ============================================================
   PAGE
============================================================ */

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const profile =
    await requireOwnerOrAdmin();


  const params =
    await searchParams;


  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  const search =
    typeof params.q === "string"
      ? params.q.trim()
      : "";


  /* ----------------------------------------------------------
     ACTION
  ---------------------------------------------------------- */

  const action =
    normalizeAction(
      params.action,
    );


  /* ----------------------------------------------------------
     PAGE
  ---------------------------------------------------------- */

  const requestedPage =
    Number.parseInt(
      params.page ?? "1",
      10,
    );

  const page =
    Number.isFinite(
      requestedPage,
    ) &&
    requestedPage > 0
      ? requestedPage
      : 1;


  /* ----------------------------------------------------------
     DATA
  ---------------------------------------------------------- */

  const {
    logs,
    total,
    page: currentPage,
    totalPages,
  } = await getAuditLogs({
    search,
    action,
    page,
    pageSize: 25,
  });


  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">


        {/* ==================================================
            HEADER
        ================================================== */}

        <header>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">

                <span>
                  Administration
                </span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>
                  Activity
                </span>

              </div>


              <div className="mt-3 flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                  <Activity className="h-5 w-5" />
                </div>

                <div>

                  <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                    Activity
                  </h1>

                  <p className="mt-1 text-sm text-neutral-500">
                    Review changes made across
                    the system.
                  </p>

                </div>

              </div>

            </div>


            {/* ------------------------------------------------
                ROLE
            ------------------------------------------------ */}

            <div className="flex shrink-0 items-center gap-2">

              <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

                <UserRound className="h-3.5 w-3.5 text-neutral-400" />

                <span className="text-xs font-medium capitalize text-neutral-700">
                  {profile.role}
                </span>

              </div>

            </div>

          </div>

        </header>


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <div className="mt-7 grid gap-3 sm:grid-cols-3">

          <SummaryCard
            icon={
              <Activity className="h-4 w-4" />
            }
            label="Total activity"
            value={total.toLocaleString(
              "en-ZA",
            )}
          />

          <SummaryCard
            icon={
              <Clock3 className="h-4 w-4" />
            }
            label="Current page"
            value={`${currentPage} / ${totalPages}`}
          />

          <SummaryCard
            icon={
              <Database className="h-4 w-4" />
            }
            label="Showing"
            value={`${logs.length} records`}
          />

        </div>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          <div className="p-4 sm:p-5">

            <form
              method="GET"
              className="flex flex-col gap-3 lg:flex-row"
            >

              {/* SEARCH */}

              <div className="relative min-w-0 flex-1">

                <Activity
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={search}
                  placeholder="Search activity..."
                  className="h-11 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-10 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-950/[0.05]"
                />

              </div>


              {/* ACTION */}

              <select
                name="action"
                defaultValue={action}
                className="h-11 rounded-xl border border-black/[0.07] bg-neutral-50 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-neutral-950/[0.05]"
              >

                <option value="all">
                  All actions
                </option>

                <option value="INSERT">
                  Created
                </option>

                <option value="UPDATE">
                  Updated
                </option>

                <option value="DELETE">
                  Deleted
                </option>

              </select>


              {/* SUBMIT */}

              <button
                type="submit"
                className="h-11 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                Search
              </button>


              {/* CLEAR */}

              {(search ||
                action !== "all") && (
                <Link
                  href="/dashboard/activity"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-black/[0.07] px-5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                >
                  Clear
                </Link>
              )}

            </form>

          </div>

        </section>


        {/* ==================================================
            ACTIVITY LIST
        ================================================== */}

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

          {/* ------------------------------------------------
              HEADER
          ------------------------------------------------ */}

          <div className="flex flex-col gap-2 border-b border-black/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

            <div>

              <h2 className="text-sm font-semibold text-neutral-950">
                Audit history
              </h2>

              <p className="mt-0.5 text-[11px] text-neutral-400">
                Every recorded database change
              </p>

            </div>


            {total > 0 && (
              <p className="text-xs text-neutral-400">
                {formatRange(
                  currentPage,
                  25,
                  total,
                )}
              </p>
            )}

          </div>


          {/* ------------------------------------------------
              EMPTY
          ------------------------------------------------ */}

          {logs.length === 0 ? (
            <EmptyState
              search={search}
              action={action}
            />
          ) : (
            <div>

              {logs.map(
                (log, index) => (
                  <ActivityRow
                    key={log.id}
                    log={log}
                    isLast={
                      index ===
                      logs.length - 1
                    }
                  />
                ),
              )}

            </div>
          )}


          {/* ------------------------------------------------
              PAGINATION
          ------------------------------------------------ */}

          {totalPages > 1 && (
            <Pagination
              currentPage={
                currentPage
              }
              totalPages={
                totalPages
              }
              search={search}
              action={action}
            />
          )}

        </section>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <div className="mt-6 flex flex-col gap-1 border-t border-black/[0.06] py-5 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">

          <p>
            Activity access is restricted to
            owners and administrators.
          </p>

          <Link
            href="/dashboard/services"
            className="inline-flex items-center gap-1.5 transition hover:text-neutral-700"
          >
            Back to dashboard
            <ArrowRight className="h-3 w-3" />
          </Link>

        </div>

      </div>
    </main>
  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4 shadow-[0_5px_25px_rgba(0,0,0,0.025)]">

      <div className="flex items-center gap-2">

        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          {icon}
        </div>

        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
          {label}
        </span>

      </div>

      <p className="mt-3 text-xl font-semibold tracking-tight text-neutral-950">
        {value}
      </p>

    </div>
  );
}


/* ============================================================
   ACTIVITY ROW
============================================================ */

function ActivityRow({
  log,
  isLast,
}: {
  log: AuditLog;
  isLast: boolean;
}) {
  const action =
    getActionConfig(
      log.action,
    );


  return (
    <article
      className={`px-5 py-5 sm:px-6 ${
        !isLast
          ? "border-b border-black/[0.05]"
          : ""
      }`}
    >

      <div className="flex gap-4">


        {/* ICON */}

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.iconClass}`}
        >
          {action.icon}
        </div>


        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <span className="text-sm font-semibold text-neutral-950">
                  {action.label}
                </span>

                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                  {log.table_name}
                </span>

              </div>


              <p className="mt-1.5 text-xs leading-5 text-neutral-500">

                {log.actor_name
                  ? (
                    <>
                      <span className="font-medium text-neutral-700">
                        {log.actor_name}
                      </span>

                      {" "}made this change.
                    </>
                  )
                  : "System activity"}

              </p>

            </div>


            {/* TIME */}

            <time
              dateTime={
                log.created_at
              }
              className="shrink-0 text-[11px] text-neutral-400"
            >
              {formatDateTime(
                log.created_at,
              )}
            </time>

          </div>


          {/* RECORD */}

          {log.record_id && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">

              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Record
              </span>

              <span className="max-w-full truncate rounded-lg bg-neutral-50 px-2 py-1 font-mono text-[10px] text-neutral-500">
                {log.record_id}
              </span>

            </div>
          )}


          {/* DATA */}

          {(log.old_data ||
            log.new_data) && (
            <AuditData
              log={log}
            />
          )}

        </div>

      </div>

    </article>
  );
}


/* ============================================================
   AUDIT DATA
============================================================ */

function AuditData({
  log,
}: {
  log: AuditLog;
}) {
  const changes =
    getChangedFields(
      log.old_data,
      log.new_data,
    );


  if (
    log.action ===
      "UPDATE" &&
    changes.length === 0
  ) {
    return null;
  }


  return (
    <details className="group mt-4">

      <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium text-neutral-500 transition hover:text-neutral-950">

        <span className="rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {log.action ===
          "UPDATE"
            ? `${changes.length} ${
                changes.length ===
                1
                  ? "field"
                  : "fields"
              } changed`
            : "View record data"}
        </span>

        <span className="transition group-open:rotate-180">
          ↓
        </span>

      </summary>


      <div className="mt-3 overflow-hidden rounded-2xl border border-black/[0.06] bg-neutral-50">

        {log.action ===
          "UPDATE" ? (
          <div className="divide-y divide-black/[0.05]">

            {changes.map(
              (change) => (
                <div
                  key={
                    change.key
                  }
                  className="grid gap-3 p-3 sm:grid-cols-[140px_1fr_1fr]"
                >

                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                    {formatFieldName(
                      change.key,
                    )}
                  </div>

                  <DataValue
                    label="Before"
                    value={
                      change.oldValue
                    }
                  />

                  <DataValue
                    label="After"
                    value={
                      change.newValue
                    }
                  />

                </div>
              ),
            )}

          </div>
        ) : (
          <pre className="max-h-[360px] overflow-auto p-4 font-mono text-[10px] leading-5 text-neutral-600">
            {JSON.stringify(
              log.new_data ??
                log.old_data,
              null,
              2,
            )}
          </pre>
        )}

      </div>

    </details>
  );
}


/* ============================================================
   DATA VALUE
============================================================ */

function DataValue({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="min-w-0">

      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
        {label}
      </p>

      <div className="max-h-20 overflow-auto rounded-lg bg-white px-2.5 py-2 font-mono text-[10px] leading-4 text-neutral-600">
        {formatDataValue(
          value,
        )}
      </div>

    </div>
  );
}


/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  search,
  action,
}: {
  search: string;

  action:
    | "all"
    | "INSERT"
    | "UPDATE"
    | "DELETE";
}) {
  const filtered =
    Boolean(
      search ||
        action !== "all",
    );


  return (
    <div className="px-6 py-16 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <Activity className="h-6 w-6" />
      </div>

      <h3 className="mt-5 text-base font-semibold text-neutral-950">
        {filtered
          ? "No matching activity"
          : "No activity yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-400">
        {filtered
          ? "Try changing your search or action filter."
          : "Recorded changes will appear here as activity happens."}
      </p>

      {filtered && (
        <Link
          href="/dashboard/activity"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-medium text-white transition hover:bg-neutral-800"
        >
          Clear filters
        </Link>
      )}

    </div>
  );
}


/* ============================================================
   PAGINATION
============================================================ */

function Pagination({
  currentPage,
  totalPages,
  search,
  action,
}: {
  currentPage: number;

  totalPages: number;

  search: string;

  action:
    | "all"
    | "INSERT"
    | "UPDATE"
    | "DELETE";
}) {
  const previousPage =
    Math.max(
      currentPage - 1,
      1,
    );

  const nextPage =
    Math.min(
      currentPage + 1,
      totalPages,
    );


  return (
    <div className="flex items-center justify-between border-t border-black/[0.06] px-5 py-4 sm:px-6">

      <div className="text-xs text-neutral-400">
        Page{" "}
        <span className="font-medium text-neutral-700">
          {currentPage}
        </span>{" "}
        of{" "}
        <span className="font-medium text-neutral-700">
          {totalPages}
        </span>
      </div>


      <div className="flex items-center gap-2">

        {currentPage > 1 ? (
          <Link
            href={buildActivityUrl({
              search,
              action,
              page: previousPage,
            })}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/[0.07] bg-white px-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl border border-black/[0.05] bg-neutral-50 px-3 text-xs font-medium text-neutral-300">
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </span>
        )}


        {currentPage <
        totalPages ? (
          <Link
            href={buildActivityUrl({
              search,
              action,
              page: nextPage,
            })}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-neutral-950 px-3 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-xl bg-neutral-100 px-3 text-xs font-medium text-neutral-300">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}

      </div>

    </div>
  );
}


/* ============================================================
   ACTION CONFIG
============================================================ */

function getActionConfig(
  action: AuditAction,
) {
  switch (action) {
    case "INSERT":
      return {
        label: "Created",

        iconClass:
          "bg-emerald-50 text-emerald-600",

        icon: (
          <FilePlus2 className="h-4 w-4" />
        ),
      };

    case "DELETE":
      return {
        label: "Deleted",

        iconClass:
          "bg-red-50 text-red-600",

        icon: (
          <FileX2 className="h-4 w-4" />
        ),
      };

    case "UPDATE":
    default:
      return {
        label: "Updated",

        iconClass:
          "bg-blue-50 text-blue-600",

        icon: (
          <FilePenLine className="h-4 w-4" />
        ),
      };
  }
}


/* ============================================================
   ACTION NORMALIZATION
============================================================ */

function normalizeAction(
  value: string | undefined,
):
  | "all"
  | "INSERT"
  | "UPDATE"
  | "DELETE" {
  switch (value) {
    case "INSERT":
      return "INSERT";

    case "UPDATE":
      return "UPDATE";

    case "DELETE":
      return "DELETE";

    default:
      return "all";
  }
}


/* ============================================================
   CHANGED FIELDS
============================================================ */

function getChangedFields(
  oldData:
    | Record<string, unknown>
    | null,

  newData:
    | Record<string, unknown>
    | null,
) {
  const keys =
    new Set([
      ...Object.keys(
        oldData ?? {},
      ),

      ...Object.keys(
        newData ?? {},
      ),
    ]);


  return Array.from(keys)
    .sort()
    .map((key) => {
      const oldValue =
        oldData?.[key];

      const newValue =
        newData?.[key];


      return {
        key,

        oldValue,

        newValue,

        changed:
          JSON.stringify(
            oldValue,
          ) !==
          JSON.stringify(
            newValue,
          ),
      };
    })
    .filter(
      (item) =>
        item.changed,
    );
}


/* ============================================================
   FIELD NAME
============================================================ */

function formatFieldName(
  value: string,
) {
  return value
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


/* ============================================================
   DATA VALUE
============================================================ */

function formatDataValue(
  value: unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "—";
  }


  if (
    typeof value ===
    "boolean"
  ) {
    return value
      ? "true"
      : "false";
  }


  if (
    typeof value ===
    "object"
  ) {
    return JSON.stringify(
      value,
    );
  }


  return String(
    value,
  );
}


/* ============================================================
   DATE / TIME
============================================================ */

function formatDateTime(
  value: string,
) {
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
   RANGE
============================================================ */

function formatRange(
  page: number,
  pageSize: number,
  total: number,
) {
  const start =
    (page - 1) *
      pageSize +
    1;

  const end =
    Math.min(
      page * pageSize,
      total,
    );


  return `${start}–${end} of ${total}`;
}


/* ============================================================
   URL
============================================================ */

function buildActivityUrl({
  search,
  action,
  page,
}: {
  search: string;

  action:
    | "all"
    | "INSERT"
    | "UPDATE"
    | "DELETE";

  page: number;
}) {
  const params =
    new URLSearchParams();


  if (search) {
    params.set(
      "q",
      search,
    );
  }


  if (action !== "all") {
    params.set(
      "action",
      action,
    );
  }


  if (page > 1) {
    params.set(
      "page",
      String(page),
    );
  }


  const query =
    params.toString();


  return query
    ? `/dashboard/activity?${query}`
    : "/dashboard/activity";
}