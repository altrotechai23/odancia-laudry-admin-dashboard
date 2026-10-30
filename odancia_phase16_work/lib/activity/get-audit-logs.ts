import { createClient } from "@/lib/supabase/server";

/* ============================================================
   TYPES
============================================================ */

export type AuditAction =
  | "INSERT"
  | "UPDATE"
  | "DELETE";

export type AuditLog = {
  id: string;

  table_name: string;

  record_id: string | null;

  action: AuditAction;

  actor_id: string | null;

  actor_name: string | null;

  old_data: Record<string, unknown> | null;

  new_data: Record<string, unknown> | null;

  created_at: string;
};

export type AuditLogsResult = {
  logs: AuditLog[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
};


/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_PAGE_SIZE = 25;


/* ============================================================
   DATABASE ROW
============================================================ */

type AuditLogRow = {
  id: string;

  table_name: string;

  record_id: string | null;

  action: string;

  actor_id: string | null;

  actor_name: string | null;

  old_data:
    | Record<string, unknown>
    | null;

  new_data:
    | Record<string, unknown>
    | null;

  created_at: string;
};


/* ============================================================
   ACTION NORMALIZATION
============================================================ */

function normalizeAuditAction(
  value: string,
): AuditAction {
  switch (value) {
    case "INSERT":
      return "INSERT";

    case "DELETE":
      return "DELETE";

    case "UPDATE":
    default:
      return "UPDATE";
  }
}


/* ============================================================
   SEARCH ESCAPING
============================================================ */

function escapeSearch(
  value: string,
) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}


/* ============================================================
   ROW MAPPER
============================================================ */

function mapAuditLog(
  row: AuditLogRow,
): AuditLog {
  return {
    id: row.id,

    table_name:
      row.table_name,

    record_id:
      row.record_id ?? null,

    action:
      normalizeAuditAction(
        row.action,
      ),

    actor_id:
      row.actor_id ?? null,

    actor_name:
      row.actor_name ?? null,

    old_data:
      row.old_data ?? null,

    new_data:
      row.new_data ?? null,

    created_at:
      row.created_at,
  };
}


/* ============================================================
   GET AUDIT LOGS
============================================================ */

export async function getAuditLogs({
  search = "",
  action = "all",
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  search?: string;

  action?:
    | "all"
    | "INSERT"
    | "UPDATE"
    | "DELETE";

  page?: number;

  pageSize?: number;
} = {}): Promise<AuditLogsResult> {
  const supabase =
    await createClient();


  /* ----------------------------------------------------------
     NORMALIZE PAGINATION
  ---------------------------------------------------------- */

  const safePageSize =
    Math.min(
      Math.max(
        Number(pageSize) || DEFAULT_PAGE_SIZE,
        1,
      ),
      100,
    );

  const safePage =
    Math.max(
      Number(page) || 1,
      1,
    );


  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  const normalizedSearch =
    search.trim();

  const escapedSearch =
    normalizedSearch
      ? escapeSearch(
          normalizedSearch,
        )
      : "";


  /* ----------------------------------------------------------
     QUERY
  ---------------------------------------------------------- */

  let query = supabase
    .from("audit_logs")
    .select(
      `
        id,
        table_name,
        record_id,
        action,
        actor_id,
        actor_name,
        old_data,
        new_data,
        created_at
      `,
      {
        count: "exact",
      },
    );


  /* ----------------------------------------------------------
     ACTION FILTER
  ---------------------------------------------------------- */

  if (action !== "all") {
    query = query.eq(
      "action",
      action,
    );
  }


  /* ----------------------------------------------------------
     SEARCH FILTER
     
     We intentionally search the columns
     that are safe and useful for the
     activity interface.

     record_id is not included in the
     OR query because PostgreSQL UUID
     comparison would fail when the
     search value isn't a valid UUID.
  ---------------------------------------------------------- */

  if (escapedSearch) {
    query = query.or(
      [
        `table_name.ilike.%${escapedSearch}%`,
        `actor_name.ilike.%${escapedSearch}%`,
        `action.ilike.%${escapedSearch}%`,
      ].join(","),
    );
  }


  /* ----------------------------------------------------------
     PAGINATION
  ---------------------------------------------------------- */

  const from =
    (safePage - 1) *
    safePageSize;

  const to =
    from +
    safePageSize -
    1;


  /* ----------------------------------------------------------
     EXECUTE
  ---------------------------------------------------------- */

  const {
    data,
    error,
    count,
  } = await query
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
    .range(
      from,
      to,
    );


  /* ----------------------------------------------------------
     ERROR
  ---------------------------------------------------------- */

  if (error) {
    const diagnostic = [
      `message=${error.message || "unknown"}`,
      `details=${error.details || "none"}`,
      `hint=${error.hint || "none"}`,
      `code=${error.code || "none"}`,
    ].join(" | ");

    console.error(
      "AUDIT LOG QUERY FAILED:",
      diagnostic,
    );

    throw new Error(
      `Audit log query failed: ${diagnostic}`,
    );
  }


  /* ----------------------------------------------------------
     RESULT
  ---------------------------------------------------------- */

  const total =
    count ?? 0;

  const totalPages =
    Math.max(
      Math.ceil(
        total /
          safePageSize,
      ),
      1,
    );


  /*
   * If somebody requests a page beyond
   * the available range, return an empty
   * result rather than throwing.
   */

  const rows =
    (data ?? []) as unknown as AuditLogRow[];

  const logs =
    rows.map(mapAuditLog);


  return {
    logs,

    total,

    page: safePage,

    pageSize: safePageSize,

    totalPages,
  };
}