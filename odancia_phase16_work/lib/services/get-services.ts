import { createClient } from "@/lib/supabase/server";

/* ============================================================
   TYPES
============================================================ */

export type ServiceStatus =
  | "pending"
  | "ready_for_collection"
  | "collected";

export type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid";

export type FulfillmentMethod =
  | "customer_pickup"
  | "delivery"
  | null;

export type LaundryService = {
  id: string;
  service_number: string | null;

  service_date: string;
  service_time: string | null;
  collection_date: string | null;
  collection_time: string | null;

  client_id: string;
  client_name: string;
  phone: string;
  email: string | null;

  price: number;
  base_price: number;
  is_express: boolean;
  express_earliest_at: string | null;
  expected_completion_at: string | null;
  deposit: number;
  amount_paid: number;
  balance: number;

  payment_type: string | null;
  payment_history: ServicePaymentTransaction[];
  payment_status: PaymentStatus;

  service_status: ServiceStatus;

  number_of_items: number | null;

  fulfillment_method: FulfillmentMethod;

  staff_id: string | null;
  staff_name: string | null;

  service_type_id: string | null;
  service_type_name: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};


export type ServicePaymentTransaction = {
  id: string;
  amount: number;
  payment_method: string;
  payment_stage: string | null;
  reference: string | null;
  notes: string | null;
  received_by: string | null;
  received_by_name: string | null;
  received_by_role: "owner" | "admin" | "staff" | null;
  paid_at: string | null;
  created_at: string;
};

export type ServicesSummary = {
  pending: number;
  ready: number;
  collected: number;
  outstanding: number;
};


/* ============================================================
   RELATION TYPES
============================================================ */

type ClientRelation = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

type ServiceTypeRelation = {
  id: string;
  name: string;
};

type ProfileRelation = {
  id: string;
  full_name: string;
  phone: string | null;
};


/* ============================================================
   DATABASE ROW
============================================================ */

type ServiceRow = {
  id: string;
  service_number: string | null;

  client_id: string;
  service_type_id: string | null;

  service_date: string;
  service_time: string | null;
  collection_date: string | null;
  collection_time: string | null;

  total_price: number | string | null;
  base_price: number | string | null;
  is_express: boolean | null;
  express_earliest_at: string | null;
  expected_completion_at: string | null;
  deposit_amount: number | string | null;
  amount_paid: number | string | null;
  balance: number | string | null;

  payment_status: string | null;
  service_status: string | null;

  fulfillment_method: string | null;

  number_of_items: number | null;
  notes: string | null;

  created_by: string | null;
  updated_by: string | null;

  created_at: string;
  updated_at: string;

  clients:
    | ClientRelation
    | ClientRelation[]
    | null;

  service_types:
    | ServiceTypeRelation
    | ServiceTypeRelation[]
    | null;

  created_by_profile:
    | ProfileRelation
    | ProfileRelation[]
    | null;
};


/* ============================================================
   RELATION HELPER
============================================================ */

function firstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}


/* ============================================================
   STATUS NORMALIZATION
============================================================ */

function normalizeServiceStatus(
  value: string | null,
): ServiceStatus {
  switch (value) {
    case "ready_for_collection":
      return "ready_for_collection";

    case "collected":
      return "collected";

    case "pending":
    default:
      return "pending";
  }
}


/* ============================================================
   FULFILLMENT NORMALIZATION
============================================================ */

function normalizeFulfillmentMethod(
  value: string | null,
): FulfillmentMethod {
  switch (value) {
    case "delivery":
      return "delivery";

    case "customer_pickup":
      return "customer_pickup";

    default:
      return null;
  }
}


/* ============================================================
   SERVICE MAPPER
============================================================ */

function mapService(
  service: ServiceRow,
  paymentHistory: ServicePaymentTransaction[] = [],
): LaundryService {
  const client =
    firstRelation(service.clients);

  const serviceType =
    firstRelation(
      service.service_types,
    );

  const staff =
    firstRelation(
      service.created_by_profile,
    );

  // The payments ledger is the source of truth when transactions exist.
  // For legacy services with no ledger rows, preserve amount_paid as a fallback,
  // but never trust a stale services.balance of zero to imply payment in full.
  const serviceTotal = Math.max(0, Number(service.total_price ?? 0));
  const storedAmountPaid = Math.max(0, Number(service.amount_paid ?? 0));
  const ledgerAmountPaid = paymentHistory.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.amount) || 0),
    0,
  );
  const effectiveAmountPaid = Math.max(
    0,
    paymentHistory.length > 0 ? ledgerAmountPaid : storedAmountPaid,
  );
  const effectiveBalance = Math.max(0, Math.round((serviceTotal - effectiveAmountPaid) * 100) / 100);
  const effectivePaymentStatus: PaymentStatus = effectiveBalance <= 0
    ? "paid"
    : effectiveAmountPaid > 0
      ? "partial"
      : "unpaid";

  return {
    id: service.id,

    service_number:
      service.service_number ?? null,

    service_date:
      service.service_date,

    service_time:
      service.service_time ?? null,

    collection_date:
      service.collection_date ?? null,

    collection_time:
      service.collection_time ?? null,

    client_id:
      service.client_id,

    client_name:
      client?.full_name ??
      "Unknown customer",

    phone:
      client?.phone ?? "",

    email:
      client?.email ?? null,

    price: serviceTotal,

    base_price: Number(service.base_price ?? service.total_price ?? 0),
    is_express: Boolean(service.is_express),
    express_earliest_at: service.express_earliest_at ?? null,
    expected_completion_at: service.expected_completion_at ?? null,

    deposit:
      Number(
        service.deposit_amount ?? 0,
      ),

    amount_paid: effectiveAmountPaid,

    balance: effectiveBalance,

    payment_type: paymentHistory[0]?.payment_method ?? null,
    payment_history: paymentHistory,

    payment_status: effectivePaymentStatus,

    service_status:
      normalizeServiceStatus(
        service.service_status,
      ),

    number_of_items:
      service.number_of_items ?? null,

    fulfillment_method:
      normalizeFulfillmentMethod(
        service.fulfillment_method,
      ),

    staff_id:
      service.created_by ?? null,

    staff_name:
      staff?.full_name ?? null,

    service_type_id:
      service.service_type_id ?? null,

    service_type_name:
      serviceType?.name ?? null,

    notes:
      service.notes ?? null,

    created_at:
      service.created_at,

    updated_at:
      service.updated_at,
  };
}


/* ============================================================
   SUMMARY
============================================================ */

function buildServicesSummary(
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
   PAYMENT HISTORY ENRICHMENT
============================================================ */

type PaymentDatabaseRow = {
  id: string;
  service_id: string;
  amount: number | string | null;
  payment_method: string | null;
  payment_stage: string | null;
  reference: string | null;
  notes: string | null;
  received_by: string | null;
  paid_at: string | null;
  created_at: string;
};

type PaymentActorProfile = {
  id: string;
  full_name: string;
  role: "owner" | "admin" | "staff";
};

async function loadPaymentHistory(
  serviceIds: string[],
): Promise<Map<string, ServicePaymentTransaction[]>> {
  const grouped = new Map<string, ServicePaymentTransaction[]>();
  if (serviceIds.length === 0) return grouped;

  const supabase = await createClient();
  const paymentRows: PaymentDatabaseRow[] = [];

  // Chunk the IDs to keep PostgREST URLs manageable for larger service lists.
  for (let start = 0; start < serviceIds.length; start += 100) {
    const chunk = serviceIds.slice(start, start + 100);
    const { data, error } = await supabase
      .from("payments")
      .select("id, service_id, amount, payment_method, payment_stage, reference, notes, received_by, paid_at, created_at")
      .in("service_id", chunk)
      .order("paid_at", { ascending: false });

    if (error) {
      console.warn("SERVICE PAYMENT HISTORY LOAD FAILED", error.message);
      // Keep the service list readable if a deployment has not yet granted the
      // expected read permission; detail reads will retry the next time.
      continue;
    }
    paymentRows.push(...((data ?? []) as unknown as PaymentDatabaseRow[]));
  }

  // The legacy payment audit trigger records the authenticated actor even for
  // older ledger rows where received_by was blank. Use it only as a fallback;
  // new service writes always set received_by to the verified operator.
  const auditActorByPayment = new Map<string, { actor_id: string | null; actor_name: string | null }>();
  const paymentIds = paymentRows.map((payment) => payment.id);
  for (let start = 0; start < paymentIds.length; start += 100) {
    const chunk = paymentIds.slice(start, start + 100);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("record_id, actor_id, actor_name")
      .eq("table_name", "payments")
      .eq("action", "INSERT")
      .in("record_id", chunk);
    if (error) {
      console.warn("LEGACY PAYMENT AUDIT ACTOR LOOKUP FAILED", error.message);
      continue;
    }
    for (const audit of data ?? []) {
      if (audit.record_id && !auditActorByPayment.has(audit.record_id)) {
        auditActorByPayment.set(audit.record_id, { actor_id: audit.actor_id ?? null, actor_name: audit.actor_name ?? null });
      }
    }
  }

  const actorIds = [...new Set(paymentRows.flatMap((payment) => {
    const id = payment.received_by ?? auditActorByPayment.get(payment.id)?.actor_id ?? null;
    return id ? [id] : [];
  }))];
  const actorProfiles = new Map<string, PaymentActorProfile>();

  for (let start = 0; start < actorIds.length; start += 100) {
    const chunk = actorIds.slice(start, start + 100);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", chunk);
    if (error) {
      console.warn("PAYMENT ACTOR PROFILE LOOKUP FAILED", error.message);
      continue;
    }
    for (const profile of (data ?? []) as unknown as PaymentActorProfile[]) {
      actorProfiles.set(profile.id, profile);
    }
  }

  for (const row of paymentRows) {
    const auditActor = auditActorByPayment.get(row.id);
    const actorId = row.received_by ?? auditActor?.actor_id ?? null;
    const actor = actorId ? actorProfiles.get(actorId) : undefined;
    const item: ServicePaymentTransaction = {
      id: row.id,
      amount: Number(row.amount ?? 0),
      payment_method: String(row.payment_method ?? "other").toLowerCase(),
      payment_stage: row.payment_stage ?? null,
      reference: row.reference ?? null,
      notes: row.notes ?? null,
      received_by: actorId,
      received_by_name: actor?.full_name ?? auditActor?.actor_name ?? null,
      received_by_role: actor?.role ?? null,
      paid_at: row.paid_at ?? null,
      created_at: row.created_at,
    };
    const list = grouped.get(row.service_id) ?? [];
    list.push(item);
    grouped.set(row.service_id, list);
  }

  return grouped;
}

/* ============================================================
   SERVICE QUERY
============================================================ */

const SERVICE_SELECT = `
  id,
  service_number,
  client_id,
  service_type_id,
  service_date,
  service_time,
  collection_date,
  collection_time,
  total_price,
  base_price,
  is_express,
  express_earliest_at,
  expected_completion_at,
  deposit_amount,
  amount_paid,
  balance,
  payment_status,
  service_status,
  fulfillment_method,
  number_of_items,
  notes,
  created_by,
  updated_by,
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
  ),

  created_by_profile:profiles!services_created_by_fkey (
    id,
    full_name,
    phone
  )
`;


/* ============================================================
   GET SERVICES
============================================================ */

export async function getServices({
  search = "",
  status = "all",
}: {
  search?: string;
  status?:
    | "all"
    | "pending"
    | "ready_for_collection"
    | "collected";
} = {}): Promise<{
  services: LaundryService[];
  summary: ServicesSummary;
  asOf: number;
}> {
  const supabase = await createClient();

  const normalizedSearch = search.trim();

  let query = supabase
    .from("services")
    .select(SERVICE_SELECT);

  /* ==========================================================
     STATUS FILTER
  ========================================================== */

  if (status !== "all") {
    query = query.eq(
      "service_status",
      status,
    );
  }

  /* ==========================================================
     SEARCH
     
     Search:
     - service number
     - notes
     - customer name
     - customer phone
  ========================================================== */

  if (normalizedSearch) {
    const escapedSearch = normalizedSearch
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/,/g, "\\,");

    /*
     * First find matching customers.
     *
     * This keeps customer searching separate
     * from the services relationship query.
     */
    const {
      data: matchingClients,
      error: clientsError,
    } = await supabase
      .from("clients")
      .select("id")
      .or(
        [
          `full_name.ilike.%${escapedSearch}%`,
          `phone.ilike.%${escapedSearch}%`,
          `email.ilike.%${escapedSearch}%`,
        ].join(","),
      );

    if (clientsError) {
      const diagnostic = [
        `message=${clientsError.message || "unknown"}`,
        `details=${clientsError.details || "none"}`,
        `hint=${clientsError.hint || "none"}`,
        `code=${clientsError.code || "none"}`,
      ].join(" | ");

      console.error(
        "CLIENT SEARCH FAILED:",
        diagnostic,
      );

      throw new Error(
        `Client search failed: ${diagnostic}`,
      );
    }

    const clientIds =
      (matchingClients ?? []).map(
        (client) => client.id,
      );

    /*
     * Build the service search.
     *
     * If customers matched, include their
     * service records as part of the search.
     */
    const searchConditions = [
      `service_number.ilike.%${escapedSearch}%`,
      `notes.ilike.%${escapedSearch}%`,
    ];

    if (clientIds.length > 0) {
      searchConditions.push(
        `client_id.in.(${clientIds.join(",")})`,
      );
    }

    query = query.or(
      searchConditions.join(","),
    );
  }

  /* ==========================================================
     ORDER
  ========================================================== */

  const {
    data,
    error,
  } = await query.order(
    "created_at",
    {
      ascending: false,
    },
  );

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {
    const diagnostic = [
      `message=${error.message || "unknown"}`,
      `details=${error.details || "none"}`,
      `hint=${error.hint || "none"}`,
      `code=${error.code || "none"}`,
    ].join(" | ");

    console.error(
      "SERVICES QUERY FAILED:",
      diagnostic,
    );

    throw new Error(
      `Services database query failed: ${diagnostic}`,
    );
  }

  /* ==========================================================
     MAP
  ========================================================== */

  const rows =
    (data ?? []) as unknown as ServiceRow[];

  const paymentHistory = await loadPaymentHistory(rows.map((row) => row.id));
  const services = rows.map((row) => mapService(row, paymentHistory.get(row.id) ?? []));

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const summary =
    buildServicesSummary(
      services,
    );

  return {
    services,
    summary,
    asOf: Date.now(),
  };
}

/* ============================================================
   GET SINGLE SERVICE
============================================================ */

export async function getService(
  serviceId: string,
): Promise<LaundryService | null> {
  const supabase =
    await createClient();

  if (!serviceId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    const diagnostic = [
      `message=${error.message || "unknown"}`,
      `details=${error.details || "none"}`,
      `hint=${error.hint || "none"}`,
      `code=${error.code || "none"}`,
    ].join(" | ");

    console.error(
      "SERVICE QUERY FAILED:",
      diagnostic,
    );

    throw new Error(
      `Service database query failed: ${diagnostic}`,
    );
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as ServiceRow;
  const paymentHistory = await loadPaymentHistory([row.id]);
  return mapService(row, paymentHistory.get(row.id) ?? []);
}