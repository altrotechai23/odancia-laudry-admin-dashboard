"use server";

import { revalidatePath } from "next/cache";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";
import {
  authorizeStaffWrite,
  clearStaffWriteAuthorization,
  logStaffServiceOperation,
} from "@/lib/staff/security";

export type UpdateCollectionScheduleState = {
  success: boolean;
  message: string;
};

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function updateServiceCollectionSchedule(
  serviceId: string,
  _previousState: UpdateCollectionScheduleState,
  formData: FormData,
): Promise<UpdateCollectionScheduleState> {
  const fail = (message: string): UpdateCollectionScheduleState => ({ success: false, message });

  try {
    await requireOwnerOrAdmin();
    if (!serviceId) return fail("Service ID is required.");

    const collectionDate = String(formData.get("collection_date") ?? "").trim();
    const collectionTime = String(formData.get("collection_time") ?? "").trim();
    const passcode = String(formData.get("staff_passcode") ?? "").trim();

    if (!isRealIsoDate(collectionDate)) return fail("Choose a valid collection date.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(collectionTime)) return fail("Choose a valid collection time.");

    const authorization = await authorizeStaffWrite(passcode);
    if (!authorization.success) return fail(authorization.message ?? "Passcode verification failed.");

    const supabase = await createClient();
    try {
      const { data: current, error: lookupError } = await supabase
        .from("services")
        .select("id, collection_date, collection_time")
        .eq("id", serviceId)
        .maybeSingle();

      if (lookupError || !current) {
        console.error("COLLECTION SCHEDULE LOOKUP FAILED", lookupError?.message ?? "service not found");
        return fail("Unable to load this service. Refresh the page and try again.");
      }

      const { data: updated, error: updateError } = await supabase
        .from("services")
        .update({
          collection_date: collectionDate,
          collection_time: collectionTime,
          updated_by: authorization.staffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId)
        .select("id")
        .maybeSingle();

      if (updateError || !updated) {
        console.error("COLLECTION SCHEDULE UPDATE FAILED", {
          message: updateError?.message ?? "No service row was updated",
          code: updateError?.code,
          details: updateError?.details,
          hint: updateError?.hint,
        });
        return fail(updateError?.message ? `Collection schedule was not saved: ${updateError.message}` : "Collection schedule was not saved. Refresh and try again.");
      }

      await logStaffServiceOperation({
        staffId: authorization.staffId,
        staffName: authorization.staffName,
        serviceId,
        action: authorization.actorRole === "staff" ? "STAFF_UPDATE_COLLECTION_SCHEDULE" : "ADMIN_UPDATE_COLLECTION_SCHEDULE",
        oldData: {
          collection_date: current.collection_date ?? null,
          collection_time: current.collection_time ?? null,
        },
        newData: {
          collection_date: collectionDate,
          collection_time: collectionTime,
        },
      });
    } finally {
      await clearStaffWriteAuthorization(authorization.authorizationId);
    }

    revalidatePath(`/dashboard/services/${serviceId}`);
    revalidatePath("/dashboard/services");
    return {
      success: true,
      message: `Collection scheduled for ${collectionDate} at ${collectionTime}.`,
    };
  } catch (error) {
    console.error("UPDATE SERVICE COLLECTION SCHEDULE FAILED", error);
    return fail("Unable to update the collection schedule. Please try again.");
  }
}
