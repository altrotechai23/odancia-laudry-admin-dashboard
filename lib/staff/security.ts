import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthorizedOperatorRole = "owner" | "admin" | "staff";

export type StaffOperationAuthorization =
  | {
      success: true;
      authorizationId: string;
      /** Kept for existing action call sites; this is the verified actor ID. */
      staffId: string;
      /** Kept for existing action call sites; this is the verified actor name. */
      staffName: string;
      actorRole: AuthorizedOperatorRole;
    }
  | { success: false; message: string };

function getLookupSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to verify staff passcodes.");
  }
  return secret;
}

export function hashStaffPasscode(passcode: string): string {
  return createHmac("sha256", getLookupSecret())
    .update(passcode, "utf8")
    .digest("hex");
}

function getSourceIp(headersList: Pick<Headers, "get">): string {
  return headersList.get("x-vercel-forwarded-for")
    ?? headersList.get("cf-connecting-ip")
    ?? headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? (process.env.NODE_ENV === "development" ? "local-development" : "unknown-source");
}

async function recordAttempt(
  admin: ReturnType<typeof createAdminClient>,
  ipHash: string,
  success: boolean,
) {
  const { error } = await admin
    .from("staff_passcode_login_attempts")
    .insert({ ip_hash: ipHash, success });
  if (error) console.warn("SERVICE PASSCODE ATTEMPT LOG FAILED", error.message);
}

async function issueAuthorization(
  admin: ReturnType<typeof createAdminClient>,
  adminUserId: string,
  actor: { id: string; full_name: string; role: AuthorizedOperatorRole },
): Promise<StaffOperationAuthorization> {
  const { data: authorization, error } = await admin
    .from("staff_operation_authorizations")
    .insert({
      auth_user_id: adminUserId,
      // For admin master-code use, this deliberately stores the current logged-in
      // admin as the actor. Staff operators store their own profile ID instead.
      staff_id: actor.id,
      expires_at: new Date(Date.now() + 30_000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !authorization) {
    console.error("SERVICE WRITE AUTHORIZATION CREATE FAILED", error?.message);
    return { success: false, message: "Unable to authorize this action. Please try again." };
  }

  return {
    success: true,
    authorizationId: authorization.id,
    staffId: actor.id,
    staffName: actor.full_name,
    actorRole: actor.role,
  };
}

/**
 * Verify a service write against either the fixed admin/owner code (0000) or
 * a unique four-digit code owned by an active staff member with an open shift.
 * The operator is tied to a short-lived database ticket, so attribution follows
 * the currently logged-in admin or the verified on-duty staff member.
 */
export async function authorizeStaffWrite(
  submittedPasscode: unknown,
): Promise<StaffOperationAuthorization> {
  const adminProfile = await requireOwnerOrAdmin();
  const passcode = String(submittedPasscode ?? "").trim();

  if (!/^\d{4}$/.test(passcode)) {
    return { success: false, message: "Enter a four-digit admin or on-duty staff passcode." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error("SERVICE PASSCODE CONFIGURATION FAILED", error);
    return { success: false, message: "Passcode verification is not configured on the server." };
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return { success: false, message: "Passcode verification is not configured on the server." };
  }

  const requestHeaders = await headers();
  const sourceIp = getSourceIp(requestHeaders);
  const rateKey = sourceIp === "unknown-source" ? `${sourceIp}:${adminProfile.id}` : sourceIp;
  const ipHash = createHmac("sha256", secret).update(rateKey).digest("hex");
  const now = Date.now();
  const cutoff = new Date(now - 15 * 60 * 1000).toISOString();
  const retentionCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: cleanupError } = await admin
    .from("staff_passcode_login_attempts")
    .delete()
    .lt("attempted_at", retentionCutoff);
  if (cleanupError) console.warn("PASSCODE ATTEMPT CLEANUP FAILED", cleanupError.message);

  const { count, error: countError } = await admin
    .from("staff_passcode_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("success", false)
    .gte("attempted_at", cutoff);

  if (countError) {
    console.error("PASSCODE RATE LIMIT LOOKUP FAILED", countError.message);
    return { success: false, message: "Unable to verify the code securely. Confirm that the staff setup migration has been applied." };
  }
  if ((count ?? 0) >= 8) {
    return { success: false, message: "Too many incorrect codes. Wait 15 minutes before trying again." };
  }

  // All active logged-in admin/owner profiles share the requested master code.
  // The ticket and all service/payment records are attributed to this session's
  // currently authenticated profile, never to another administrator.
  if (passcode === "0000") {
    const result = await issueAuthorization(admin, adminProfile.id, {
      id: adminProfile.id,
      full_name: adminProfile.full_name,
      role: adminProfile.role,
    });
    await recordAttempt(admin, ipHash, result.success);
    return result;
  }

  let lookupHash: string;
  try {
    lookupHash = hashStaffPasscode(passcode);
  } catch (error) {
    console.error("STAFF PASSCODE HASH FAILED", error);
    return { success: false, message: "Passcode verification is not configured on the server." };
  }

  const { data: credential, error: credentialError } = await admin
    .from("staff_passcode_credentials")
    .select("staff_id")
    .eq("passcode_lookup_hash", lookupHash)
    .maybeSingle();

  if (credentialError) {
    console.error("STAFF PASSCODE LOOKUP FAILED", credentialError.message);
    return { success: false, message: "Unable to verify this code. Please try again." };
  }

  if (!credential) {
    await recordAttempt(admin, ipHash, false);
    return { success: false, message: "Invalid code. Use 0000 for the logged-in admin or a valid passcode for an on-duty staff member." };
  }

  const [{ data: staff, error: staffError }, { data: openShift, error: shiftError }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", credential.staff_id)
      .maybeSingle(),
    admin
      .from("staff_shifts")
      .select("id")
      .eq("staff_id", credential.staff_id)
      .is("checked_out_at", null)
      .maybeSingle(),
  ]);

  if (staffError || shiftError) {
    console.error("STAFF OPERATION AUTHORIZATION LOOKUP FAILED", {
      staffError: staffError?.message,
      shiftError: shiftError?.message,
    });
    return { success: false, message: "Unable to verify staff status. Please try again." };
  }

  if (!staff || staff.role !== "staff" || !staff.is_active || !openShift) {
    await recordAttempt(admin, ipHash, false);
    return { success: false, message: "The staff member must be active and currently clocked in." };
  }

  const result = await issueAuthorization(admin, adminProfile.id, {
    id: staff.id,
    full_name: staff.full_name,
    role: "staff",
  });
  await recordAttempt(admin, ipHash, result.success);
  return result;
}

export async function clearStaffWriteAuthorization(authorizationId?: string): Promise<void> {
  if (!authorizationId) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("staff_operation_authorizations")
      .delete()
      .eq("id", authorizationId);
    if (error) console.warn("SERVICE WRITE AUTHORIZATION CLEANUP FAILED", error.message);
  } catch (error) {
    console.warn("SERVICE WRITE AUTHORIZATION CLEANUP FAILED", error);
  }
}

export async function logStaffServiceOperation(args: {
  staffId: string;
  staffName: string;
  serviceId: string;
  action: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      table_name: "services",
      record_id: args.serviceId,
      action: args.action,
      actor_id: args.staffId,
      actor_name: args.staffName,
      old_data: args.oldData ?? null,
      new_data: args.newData ?? null,
    });
    if (error) console.warn("SERVICE AUDIT LOG FAILED", error.message);
  } catch (error) {
    console.warn("SERVICE AUDIT LOG FAILED", error);
  }
}
