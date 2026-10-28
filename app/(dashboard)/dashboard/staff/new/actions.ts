"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashStaffPasscode } from "@/lib/staff/security";

export type CreateStaffState = {
  success: boolean;
  message: string;
};

export async function createStaffAction(
  _previousState: CreateStaffState,
  formData: FormData,
): Promise<CreateStaffState> {
  const actor = await requireOwnerOrAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const passcode = String(formData.get("passcode") ?? "").trim();

  if (fullName.length < 2 || fullName.length > 120) {
    return { success: false, message: "Enter a full name between 2 and 120 characters." };
  }
  if (phone.length < 7 || phone.length > 30) {
    return { success: false, message: "Enter a valid staff phone number." };
  }
  if (address.length < 5 || address.length > 300) {
    return { success: false, message: "Enter the staff member's physical address." };
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { success: false, message: "Please enter a valid contact email address." };
  }
  if (!/^\d{4}$/.test(passcode)) {
    return { success: false, message: "The staff passcode must be exactly 4 digits." };
  }
  if (passcode === "0000") {
    return { success: false, message: "0000 is reserved for the currently logged-in administrator. Choose a different staff passcode." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("STAFF ADMIN CLIENT FAILED", error);
    return { success: false, message: "The server is not configured for secure staff creation." };
  }

  let passcodeHash: string;
  try {
    passcodeHash = hashStaffPasscode(passcode);
  } catch (error) {
    console.error("STAFF PASSCODE HASH FAILED", error);
    return { success: false, message: "Staff passcode security is not configured on the server." };
  }

  const { data: duplicate, error: duplicateError } = await admin
    .from("staff_passcode_credentials")
    .select("staff_id")
    .eq("passcode_lookup_hash", passcodeHash)
    .maybeSingle();
  if (duplicateError) {
    console.error("STAFF PASSCODE DUPLICATE CHECK FAILED", duplicateError.message);
    return { success: false, message: "Unable to verify the passcode. Apply the staff setup migration and try again." };
  }
  if (duplicate) {
    return { success: false, message: "That 4-digit passcode is already assigned. Choose another code." };
  }

  // Staff profiles are data records, not dashboard login accounts. The Auth user
  // exists only to satisfy the existing profiles.id relationship; its random
  // password and private synthetic email are never shown or used for sign-in.
  const internalAccountId = randomUUID();
  const loginEmail = `staff-${internalAccountId}@staff-auth.invalid`;
  const randomPassword = randomBytes(32).toString("base64url");
  const { data: created, error: authCreateError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, odancia_staff_record: true },
  });

  if (authCreateError || !created.user) {
    console.error("STAFF INTERNAL AUTH RECORD CREATE FAILED", authCreateError?.message);
    return { success: false, message: "Unable to create the staff record. Please check Supabase server configuration." };
  }
  // profiles.id references auth.users.id, so always use the ID returned by Supabase Auth.
  const staffId = created.user.id;

  const cleanupStaff = async () => {
    await admin.from("staff_passcode_credentials").delete().eq("staff_id", staffId);
    await admin.from("profiles").delete().eq("id", staffId);
    await admin.auth.admin.deleteUser(staffId);
  };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: staffId,
    full_name: fullName,
    phone,
    address,
    contact_email: contactEmail || null,
    role: "staff",
    is_active: true,
  }, { onConflict: "id" });

  if (profileError) {
    console.error("STAFF PROFILE CREATE FAILED", profileError.message);
    await cleanupStaff();
    return { success: false, message: "Unable to save the staff profile. No new staff record was kept; please try again." };
  }

  const { error: passcodeError } = await admin.from("staff_passcode_credentials").insert({
    staff_id: staffId,
    login_email: loginEmail,
    passcode_lookup_hash: passcodeHash,
  });

  if (passcodeError) {
    console.error("STAFF PASSCODE CREDENTIAL CREATE FAILED", passcodeError.message);
    await cleanupStaff();
    return {
      success: false,
      message: passcodeError.code === "23505"
        ? "That 4-digit passcode is already assigned. Choose another code."
        : "Unable to save the staff passcode. No new staff record was kept; please try again.",
    };
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    table_name: "staff_management",
    record_id: staffId,
    action: "CREATE_STAFF",
    actor_id: actor.id,
    actor_name: actor.full_name,
    old_data: null,
    new_data: {
      id: staffId,
      full_name: fullName,
      phone,
      address,
      contact_email: contactEmail || null,
      role: "staff",
      is_active: true,
      passcode_set: true,
    },
  });
  if (auditError) console.warn("STAFF CREATION AUDIT FAILED", auditError.message);

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard/shift");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: `${fullName} was added. They do not log in; their unique four-digit passcode authorizes service changes only while they are on duty.`,
  };
}
