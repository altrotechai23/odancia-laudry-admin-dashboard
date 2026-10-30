"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Enter your email address." };
  if (!password) return { error: "Enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn("Administrator login failed.", error.message);
    return { error: "Invalid email address or password." };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await supabase.auth.signOut();
    return { error: "Unable to establish your session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "Your account profile could not be found. Contact the system administrator." };
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account is inactive. Contact the system administrator." };
  }
  if (profile.role !== "owner" && profile.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Only administrator accounts can sign in. Staff records do not have dashboard login access." };
  }

  redirect("/dashboard");
}
