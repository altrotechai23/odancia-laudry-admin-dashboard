"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export async function createClientAction(
  _previousState: {
    success: boolean;
    message: string;
  },
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
}> {
  await requireOwnerOrAdmin();

  const fullName = String(
    formData.get("full_name") ?? "",
  ).trim();

  const phone = String(
    formData.get("phone") ?? "",
  ).trim();

  const email = String(
    formData.get("email") ?? "",
  ).trim();

  if (!fullName) {
    return {
      success: false,
      message: "Client name is required.",
    };
  }

  if (!phone) {
    return {
      success: false,
      message: "Phone number is required.",
    };
  }

  if (email && !isValidEmail(email)) {
    return {
      success: false,
      message: "Please enter a valid email address.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .insert({
      full_name: fullName,
      phone,
      email: email || null,
    });

  if (error) {
    console.error(
      "CLIENT CREATE FAILED:",
      error,
    );

    return {
      success: false,
      message:
        "Unable to create this client right now. Please try again.",
    };
  }

  revalidatePath("/dashboard/clients");

  redirect("/dashboard/clients");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}