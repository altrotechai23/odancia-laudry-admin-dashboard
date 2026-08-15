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

  client_id: string;
  client_name: string;
  phone: string;
  email: string | null;

  price: number;
  deposit: number;
  amount_paid: number;
  balance: number;

  payment_type: string | null;
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

  total_price: number | string | null;
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
   PAYMENT NORMALIZATION
============================================================ */

function normalizePaymentStatus(
  value: string | null,
): PaymentStatus {
  switch (value) {
    case "paid":
      return "paid";

    case "partial":
      return "partial";

    case "unpaid":
    default:
      return "unpaid";
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

    client_id:
      service.client_id,

    client_name:
      client?.full_name ??
      "Unknown customer",

    phone:
      client?.phone ?? "",

    email:
      client?.email ?? null,

    price:
      Number(
        service.total_price ?? 0,
      ),

    deposit:
      Number(
        service.deposit_amount ?? 0,
      ),

    amount_paid:
      Number(
        service.amount_paid ?? 0,
      ),

    balance:
      Number(
        service.balance ?? 0,
      ),

    /*
     * Payment type will be supplied by
     * the payments system when payment
     * transactions are implemented.
     */
    payment_type: null,

    payment_status:
      normalizePaymentStatus(
        service.payment_status,
      ),

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
  total_price,
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

  const services =
    rows.map(mapService);

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

  return mapService(
    data as unknown as ServiceRow,
  );
}