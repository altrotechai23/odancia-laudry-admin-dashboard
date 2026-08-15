import { createClient } from "@/lib/supabase/server";

/* ============================================================
   TYPES
============================================================ */

export type StaffRole =
  | "owner"
  | "admin"
  | "staff";

export type StaffMember = {
  id: string;
  full_name: string;
  phone: string | null;
  role: StaffRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffSummary = {
  total: number;
  active: number;
  inactive: number;
  owners: number;
  admins: number;
  staff: number;
};


/* ============================================================
   DATABASE ROW
============================================================ */

type StaffRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};


/* ============================================================
   ROLE NORMALIZATION
============================================================ */

function normalizeStaffRole(
  value: string | null,
): StaffRole {
  switch (value) {
    case "owner":
      return "owner";

    case "admin":
      return "admin";

    case "staff":
    default:
      return "staff";
  }
}


/* ============================================================
   STAFF MAPPER
============================================================ */

function mapStaff(
  row: StaffRow,
): StaffMember {
  return {
    id: row.id,

    full_name:
      row.full_name?.trim() ||
      "Unnamed staff member",

    phone:
      row.phone ?? null,

    role:
      normalizeStaffRole(
        row.role,
      ),

    avatar_url:
      row.avatar_url ?? null,

    is_active:
      row.is_active ?? false,

    created_at:
      row.created_at,

    updated_at:
      row.updated_at,
  };
}


/* ============================================================
   SUMMARY
============================================================ */

function buildStaffSummary(
  staff: StaffMember[],
): StaffSummary {
  return staff.reduce<StaffSummary>(
    (result, member) => {
      result.total += 1;

      if (member.is_active) {
        result.active += 1;
      } else {
        result.inactive += 1;
      }

      switch (member.role) {
        case "owner":
          result.owners += 1;
          break;

        case "admin":
          result.admins += 1;
          break;

        case "staff":
          result.staff += 1;
          break;
      }

      return result;
    },
    {
      total: 0,
      active: 0,
      inactive: 0,
      owners: 0,
      admins: 0,
      staff: 0,
    },
  );
}


/* ============================================================
   GET STAFF
============================================================ */

export async function getStaff({
  search = "",
}: {
  search?: string;
} = {}): Promise<{
  staff: StaffMember[];
  summary: StaffSummary;
}> {
  const supabase =
    await createClient();

  const normalizedSearch =
    search.trim();

  let query = supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        phone,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at
      `,
    );

  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  if (normalizedSearch) {
    const escapedSearch =
      normalizedSearch
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_")
        .replace(/,/g, "\\,");

    query = query.or(
      [
        `full_name.ilike.%${escapedSearch}%`,
        `phone.ilike.%${escapedSearch}%`,
        `role.ilike.%${escapedSearch}%`,
      ].join(","),
    );
  }

  /* ----------------------------------------------------------
     ORDER
  ---------------------------------------------------------- */

  const {
    data,
    error,
  } = await query.order(
    "created_at",
    {
      ascending: false,
    },
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
      "STAFF QUERY FAILED:",
      diagnostic,
    );

    throw new Error(
      `Staff database query failed: ${diagnostic}`,
    );
  }

  /* ----------------------------------------------------------
     MAP
  ---------------------------------------------------------- */

  const rows =
    (data ?? []) as unknown as StaffRow[];

  const staff =
    rows.map(mapStaff);

  /* ----------------------------------------------------------
     SUMMARY
  ---------------------------------------------------------- */

  const summary =
    buildStaffSummary(
      staff,
    );

  return {
    staff,
    summary,
  };
}


/* ============================================================
   GET SINGLE STAFF MEMBER
============================================================ */

export async function getStaffMember(
  staffId: string,
): Promise<StaffMember | null> {
  const supabase =
    await createClient();

  if (!staffId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        phone,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at
      `,
    )
    .eq("id", staffId)
    .maybeSingle();

  if (error) {
    const diagnostic = [
      `message=${error.message || "unknown"}`,
      `details=${error.details || "none"}`,
      `hint=${error.hint || "none"}`,
      `code=${error.code || "none"}`,
    ].join(" | ");

    console.error(
      "STAFF MEMBER QUERY FAILED:",
      diagnostic,
    );

    throw new Error(
      `Staff member database query failed: ${diagnostic}`,
    );
  }

  if (!data) {
    return null;
  }

  return mapStaff(
    data as unknown as StaffRow,
  );
}