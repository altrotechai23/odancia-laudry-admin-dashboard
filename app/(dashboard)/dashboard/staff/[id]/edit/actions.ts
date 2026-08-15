"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import type {
  UpdateStaffRole,
  UpdateStaffState,
} from "./types";

/* ============================================================
   UPDATE STAFF
   ============================================================

   IMPORTANT:

   This is intentionally a direct async server action.

   Do NOT create a function such as:

   createUpdateStaffAction(staffId)

   inside a "use server" module.

   Next.js 16 requires exported server actions to themselves
   be async functions.
============================================================ */

export async function updateStaff(
  staffId: string,
  _previousState: UpdateStaffState,
  formData: FormData,
): Promise<UpdateStaffState> {
  /* ----------------------------------------------------------
     VERIFY CURRENT USER
  ---------------------------------------------------------- */

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message:
        "You must be logged in to update staff accounts.",
    };
  }

  /* ----------------------------------------------------------
     VERIFY CURRENT USER PROFILE
  ---------------------------------------------------------- */

  const {
    data: currentProfile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, is_active",
    )
    .eq("id", user.id)
    .single();

  if (profileError || !currentProfile) {
    console.error(
      "CURRENT PROFILE VERIFICATION FAILED:",
      profileError,
    );

    return {
      success: false,
      message:
        "Your profile could not be verified.",
    };
  }

  /* ----------------------------------------------------------
     AUTHORIZATION
  ---------------------------------------------------------- */

  if (
    currentProfile.role !== "owner" &&
    currentProfile.role !== "admin"
  ) {
    return {
      success: false,
      message:
        "Only owners and administrators can update staff accounts.",
    };
  }

  if (!currentProfile.is_active) {
    return {
      success: false,
      message:
        "Your account is inactive.",
    };
  }

  /* ----------------------------------------------------------
     VALIDATE STAFF ID
  ---------------------------------------------------------- */

  if (!staffId || typeof staffId !== "string") {
    return {
      success: false,
      message:
        "Staff member could not be identified.",
    };
  }

  /* ----------------------------------------------------------
     GET EXISTING STAFF PROFILE
  ---------------------------------------------------------- */

  const {
    data: existingProfile,
    error: existingProfileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        phone,
        role,
        avatar_url,
        is_active
      `,
    )
    .eq("id", staffId)
    .maybeSingle();

  if (
    existingProfileError ||
    !existingProfile
  ) {
    console.error(
      "STAFF PROFILE LOAD FAILED:",
      existingProfileError,
    );

    return {
      success: false,
      message:
        "Staff member could not be found.",
    };
  }

  /* ----------------------------------------------------------
     PROTECT OWNER ACCOUNTS FROM ADMINS
  ---------------------------------------------------------- */

  if (
    existingProfile.role === "owner" &&
    currentProfile.role !== "owner"
  ) {
    return {
      success: false,
      message:
        "Administrators cannot modify owner accounts.",
    };
  }

  /* ----------------------------------------------------------
     READ FORM DATA
  ---------------------------------------------------------- */

  const fullName = String(
    formData.get("full_name") ?? "",
  ).trim();

  const phone = String(
    formData.get("phone") ?? "",
  ).trim();

  const requestedRole =
    String(
      formData.get("role") ??
        existingProfile.role,
    ) as UpdateStaffRole;

  /*
   * Checkbox behavior:
   *
   * checked   -> "on"
   * unchecked -> null
   */
  const isActive =
    formData.get("is_active") === "on";

  /* ----------------------------------------------------------
     VALIDATE NAME
  ---------------------------------------------------------- */

  if (!fullName) {
    return {
      success: false,
      message:
        "Please enter the staff member's full name.",
    };
  }

  if (fullName.length < 2) {
    return {
      success: false,
      message:
        "Full name must contain at least 2 characters.",
    };
  }

  if (fullName.length > 120) {
    return {
      success: false,
      message:
        "Full name must be 120 characters or less.",
    };
  }

  /* ----------------------------------------------------------
     VALIDATE ROLE
  ---------------------------------------------------------- */

  if (
    requestedRole !== "staff" &&
    requestedRole !== "admin" &&
    requestedRole !== "owner"
  ) {
    return {
      success: false,
      message:
        "Invalid staff role.",
    };
  }

  /* ----------------------------------------------------------
     OWNER ROLE PROTECTION
  ---------------------------------------------------------- */

  if (
    requestedRole === "owner" &&
    currentProfile.role !== "owner"
  ) {
    return {
      success: false,
      message:
        "Only the owner can assign the owner role.",
    };
  }

  /* ----------------------------------------------------------
     ADMIN PROTECTION
  ---------------------------------------------------------- */

  if (
    currentProfile.role === "admin" &&
    requestedRole === "owner"
  ) {
    return {
      success: false,
      message:
        "Administrators cannot assign the owner role.",
    };
  }

  /* ----------------------------------------------------------
     SELF-PROTECTION
  ----------------------------------------------------------

     Prevent an administrator from accidentally disabling
     their own account.

     Also prevent an owner from accidentally disabling
     themselves.
  ---------------------------------------------------------- */

  if (
    staffId === user.id &&
    !isActive
  ) {
    return {
      success: false,
      message:
        "You cannot deactivate your own account.",
    };
  }

  /* ----------------------------------------------------------
     ADMIN CLIENT
  ---------------------------------------------------------- */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "ADMIN SUPABASE CLIENT FAILED:",
      error,
    );

    return {
      success: false,
      message:
        "The server is not configured correctly. Please check the Supabase service role configuration.",
    };
  }

  /* ----------------------------------------------------------
     UPDATE PROFILE
  ---------------------------------------------------------- */

  const {
    error: updateProfileError,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
      role: requestedRole,
      is_active: isActive,
    })
    .eq("id", staffId);

  if (updateProfileError) {
    console.error(
      "UPDATE STAFF PROFILE FAILED:",
      {
        message:
          updateProfileError.message,
        details:
          updateProfileError.details,
        hint:
          updateProfileError.hint,
        code:
          updateProfileError.code,
      },
    );

    return {
      success: false,
      message:
        `Unable to update the staff profile: ${updateProfileError.message}`,
    };
  }

  /* ----------------------------------------------------------
     VERIFY UPDATE
  ---------------------------------------------------------- */

  const {
    data: verifiedProfile,
    error: verifyError,
  } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, phone, role, is_active",
    )
    .eq("id", staffId)
    .maybeSingle();

  if (
    verifyError ||
    !verifiedProfile
  ) {
    console.error(
      "UPDATED PROFILE VERIFICATION FAILED:",
      verifyError,
    );

    return {
      success: false,
      message:
        "The profile was updated but could not be verified.",
    };
  }

  /* ----------------------------------------------------------
     REVALIDATE
  ---------------------------------------------------------- */

  revalidatePath(
    "/dashboard/staff",
  );

  revalidatePath(
    `/dashboard/staff/${staffId}/edit`,
  );

  revalidatePath(
    "/dashboard",
  );

  /* ----------------------------------------------------------
     SUCCESS
  ---------------------------------------------------------- */

  return {
    success: true,
    message:
      `${fullName}'s profile was updated successfully.`,
  };
}