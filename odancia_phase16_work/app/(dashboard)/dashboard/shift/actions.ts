"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type ShiftActionResult = { success: boolean; message: string };
export type ShiftIntent = "clock_in" | "clock_out";

export async function updateStaffShift(staffId: string, intent: ShiftIntent): Promise<ShiftActionResult> {
  const actor = await requireOwnerOrAdmin();
  if (!staffId || (intent !== "clock_in" && intent !== "clock_out")) {
    return { success: false, message: "Choose a staff member and a valid attendance action." };
  }

  const admin = createAdminClient();
  const { data: staff, error: staffError } = await admin
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", staffId)
    .maybeSingle();

  if (staffError || !staff || staff.role !== "staff") {
    console.error("STAFF SHIFT PROFILE LOOKUP FAILED", staffError?.message);
    return { success: false, message: "That staff record could not be found." };
  }

  const { data: openShift, error: shiftError } = await admin
    .from("staff_shifts")
    .select("id, checked_in_at")
    .eq("staff_id", staffId)
    .is("checked_out_at", null)
    .maybeSingle();

  if (shiftError) {
    console.error("STAFF SHIFT LOOKUP FAILED", shiftError.message);
    return { success: false, message: "Attendance is not configured. Apply the Odancia staff setup migration first." };
  }

  if (intent === "clock_in") {
    if (!staff.is_active) return { success: false, message: "Inactive staff cannot be clocked in. Reactivate the record first." };
    if (openShift) return { success: false, message: `${staff.full_name} is already clocked in.` };

    const { error } = await admin.from("staff_shifts").insert({
      staff_id: staffId,
      checked_in_at: new Date().toISOString(),
      checked_in_by: actor.id,
    });
    if (error) {
      console.error("STAFF CLOCK-IN FAILED", error.message);
      return { success: false, message: error.code === "23505" ? `${staff.full_name} is already clocked in.` : "Unable to clock in this staff member. Please try again." };
    }
  } else {
    if (!openShift) return { success: false, message: `${staff.full_name} is not currently clocked in.` };
    const { error } = await admin.from("staff_shifts").update({
      checked_out_at: new Date().toISOString(),
      checked_out_by: actor.id,
    }).eq("id", openShift.id).is("checked_out_at", null);

    if (error) {
      console.error("STAFF CLOCK-OUT FAILED", error.message);
      return { success: false, message: "Unable to clock out this staff member. Please refresh and try again." };
    }
  }

  revalidatePath("/dashboard/shift");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/staff");
  return { success: true, message: intent === "clock_in" ? `${staff.full_name} is now clocked in.` : `${staff.full_name} has been clocked out.` };
}
