"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashStaffPasscode } from "@/lib/staff/security";
import type { UpdateStaffState } from "./types";

export async function updateStaff(
  staffId: string,
  _previousState: UpdateStaffState,
  formData: FormData,
): Promise<UpdateStaffState> {
  const actor = await requireOwnerOrAdmin();
  if (!staffId) return { success: false, message: "Staff member could not be identified." };

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id, full_name, phone, address, contact_email, role, is_active")
    .eq("id", staffId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("STAFF PROFILE LOAD FAILED", existingError?.message);
    return { success: false, message: "Staff member could not be found." };
  }
  if (existing.role === "owner" && actor.role !== "owner") {
    return { success: false, message: "Administrators cannot modify an owner account." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  const newPasscode = String(formData.get("new_passcode") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (fullName.length < 2 || fullName.length > 120) {
    return { success: false, message: "Full name must contain 2–120 characters." };
  }
  if (phone && (phone.length < 7 || phone.length > 30)) {
    return { success: false, message: "Enter a valid phone number." };
  }
  if (address.length > 300) return { success: false, message: "Address must be 300 characters or less." };
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { success: false, message: "Please enter a valid contact email address." };
  }
  if (staffId === actor.id && !isActive) {
    return { success: false, message: "You cannot deactivate your own administrator account." };
  }
  if (newPasscode && existing.role !== "staff") {
    return { success: false, message: "Only a staff profile can have a service passcode." };
  }
  if (newPasscode && !/^\d{4}$/.test(newPasscode)) {
    return { success: false, message: "A staff passcode must contain exactly 4 digits." };
  }
  if (newPasscode === "0000") {
    return { success: false, message: "0000 is reserved for the currently logged-in administrator. Choose a different staff passcode." };
  }

  let oldCredential: { staff_id: string; login_email: string; passcode_lookup_hash: string; updated_at?: string } | null = null;
  let wrotePasscode = false;
  if (newPasscode) {
    let newHash: string;
    try {
      newHash = hashStaffPasscode(newPasscode);
    } catch (error) {
      console.error("STAFF PASSCODE HASH FAILED", error);
      return { success: false, message: "Staff passcode security is not configured on the server." };
    }

    const { data: duplicate, error: duplicateError } = await admin
      .from("staff_passcode_credentials")
      .select("staff_id")
      .eq("passcode_lookup_hash", newHash)
      .maybeSingle();
    if (duplicateError) {
      console.error("STAFF PASSCODE DUPLICATE LOOKUP FAILED", duplicateError.message);
      return { success: false, message: "Unable to verify this passcode. Check the staff migration and try again." };
    }
    if (duplicate && duplicate.staff_id !== staffId) {
      return { success: false, message: "That 4-digit code is already assigned. Choose a different code." };
    }

    const { data: currentCredential, error: credentialError } = await admin
      .from("staff_passcode_credentials")
      .select("staff_id, login_email, passcode_lookup_hash, updated_at")
      .eq("staff_id", staffId)
      .maybeSingle();
    if (credentialError) {
      console.error("STAFF PASSCODE CREDENTIAL LOAD FAILED", credentialError.message);
      return { success: false, message: "Unable to load the staff passcode record." };
    }
    oldCredential = currentCredential;

    let loginEmail = currentCredential?.login_email;
    if (!loginEmail) {
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(staffId);
      if (authError || !authData.user?.email) {
        return { success: false, message: "The staff record cannot be linked to its internal account. No changes were saved." };
      }
      loginEmail = authData.user.email;
    }

    const { error: upsertError } = await admin.from("staff_passcode_credentials").upsert({
      staff_id: staffId,
      login_email: loginEmail,
      passcode_lookup_hash: newHash,
      updated_at: new Date().toISOString(),
    }, { onConflict: "staff_id" });
    if (upsertError) {
      console.error("STAFF PASSCODE RESET FAILED", upsertError.message);
      return { success: false, message: "Unable to set the new staff passcode." };
    }
    wrotePasscode = true;
  }

  const { error: updateError } = await admin.from("profiles").update({
    full_name: fullName,
    phone: phone || null,
    address: address || null,
    contact_email: contactEmail || null,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  }).eq("id", staffId);

  if (updateError) {
    console.error("STAFF PROFILE UPDATE FAILED", updateError.message);
    if (wrotePasscode) {
      if (oldCredential) {
        const { error } = await admin.from("staff_passcode_credentials").upsert(oldCredential, { onConflict: "staff_id" });
        if (error) console.error("PASSCODE ROLLBACK FAILED", error.message);
      } else {
        const { error } = await admin.from("staff_passcode_credentials").delete().eq("staff_id", staffId);
        if (error) console.error("PASSCODE ROLLBACK FAILED", error.message);
      }
    }
    return { success: false, message: `Unable to update the profile: ${updateError.message}` };
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    table_name: "staff_management",
    record_id: staffId,
    action: "UPDATE_STAFF",
    actor_id: actor.id,
    actor_name: actor.full_name,
    old_data: {
      full_name: existing.full_name,
      phone: existing.phone,
      address: existing.address,
      contact_email: existing.contact_email,
      is_active: existing.is_active,
    },
    new_data: {
      full_name: fullName,
      phone: phone || null,
      address: address || null,
      contact_email: contactEmail || null,
      is_active: isActive,
      passcode_reset: Boolean(newPasscode),
    },
  });
  if (auditError) console.warn("STAFF UPDATE AUDIT FAILED", auditError.message);

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}/edit`);
  revalidatePath("/dashboard/shift");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: newPasscode
      ? `${fullName}'s profile was saved and their 4-digit service passcode was reset.`
      : `${fullName}'s profile was updated successfully.`,
  };
}
