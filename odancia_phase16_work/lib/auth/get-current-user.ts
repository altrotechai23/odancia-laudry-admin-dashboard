import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CurrentUserProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "owner" | "admin" | "staff";
  avatar_url: string | null;
  is_active: boolean;
};

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, role, avatar_url, is_active",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as CurrentUserProfile;
}

export async function requireUser() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.is_active || (profile.role !== "owner" && profile.role !== "admin")) {
    redirect("/login");
  }

  return profile;
}

export async function requireOwnerOrAdmin() {
  const profile = await requireUser();

  if (profile.role !== "owner" && profile.role !== "admin") {
    redirect("/dashboard/services");
  }

  return profile;
}