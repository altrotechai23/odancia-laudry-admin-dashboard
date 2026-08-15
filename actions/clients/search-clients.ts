"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-current-user";

export type ClientSearchResult = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

export async function searchClients(
  query: string,
): Promise<ClientSearchResult[]> {
  await requireUser();

  const supabase = await createClient();

  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const escapedQuery = normalizedQuery
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

  const { data, error } = await supabase
    .from("clients")
    .select(
      `
        id,
        full_name,
        phone,
        email
      `,
    )
    .or(
      `full_name.ilike.%${escapedQuery}%,phone.ilike.%${escapedQuery}%`,
    )
    .eq("is_active", true)
    .order("full_name")
    .limit(8);

  if (error) {
    console.error(
      "Client search error:",
      error,
    );

    return [];
  }

  return data ?? [];
}