import { createClient } from "@/lib/supabase/server";

export async function getServiceTypes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("service_types")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return data;
}