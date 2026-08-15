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
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") ?? "").trim();

  if (!email) {
    return {
      error: "Enter your email address.",
    };
  }

  if (!password) {
    return {
      error: "Enter your password.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Login error:", error.message);

    return {
      error: "Invalid email address or password.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Unable to establish your session.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();

    return {
      error:
        "Your account profile could not be found. Contact the owner.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();

    return {
      error:
        "Your account is inactive. Contact the owner.",
    };
  }

  if (profile.role === "staff") {
    redirect("/dashboard/services");
  }

  redirect("/dashboard");
}