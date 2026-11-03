"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

export async function updateClientAction(_previous: { success: boolean; message: string }, formData: FormData) {
  await requireOwnerOrAdmin();
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!id || full_name.length < 2 || phone.length < 7) return { success: false, message: "Enter a valid client name and phone number." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, message: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ full_name, phone, email: email || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) {
    console.error("CLIENT UPDATE FAILED:", error);
    return { success: false, message: error.message.includes("duplicate") ? "That phone number is already assigned to another client." : "Unable to update this client." };
  }
  revalidatePath(`/dashboard/clients/${id}`);
  revalidatePath(`/dashboard/clients/${id}/edit`);
  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${id}`);
}
