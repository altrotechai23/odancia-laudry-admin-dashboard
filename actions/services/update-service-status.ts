"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { authorizeStaffWrite, clearStaffWriteAuthorization, logStaffServiceOperation } from "@/lib/staff/security";

import {
  sendReadyForCollectionSms,
} from "@/lib/notifications/service-sms";

type ServiceStatus =
  | "pending"
  | "ready_for_collection"
  | "collected";

type UpdateServiceStatusResult = {
  success: boolean;
  message: string;
};

export async function updateServiceStatus(
  serviceId: string,
  status: ServiceStatus,
  passcode = "",
): Promise<UpdateServiceStatusResult> {
  if (!serviceId) {
    return {
      success: false,
      message:
        "Service ID is required.",
    };
  }
  if (!["pending", "ready_for_collection", "collected"].includes(String(status))) {
    return { success: false, message: "Choose a valid service status." };
  }

  await requireOwnerOrAdmin();
  const supabase =
    await createClient();

  /*
   * ----------------------------------------------------------
   * FETCH SERVICE
   * ----------------------------------------------------------
   */

  const {
    data: service,
    error: serviceError,
  } = await supabase
    .from("services")
    .select(`
      id,
      service_date,
      collection_date,
      collection_time,
      service_status,
      number_of_items,
      fulfillment_method,
      total_price,
      client:clients (
        full_name,
        phone
      ),
      service_type:service_types (
        name,
        description
      )
    `)
    .eq("id", serviceId)
    .single();

  if (
    serviceError ||
    !service
  ) {
    console.error(
      "SERVICE FETCH FAILED:",
      serviceError,
    );

    return {
      success: false,
      message:
        "Unable to find service.",
    };
  }

  /*
   * ----------------------------------------------------------
   * BARCODE AUTHORIZATION + UPDATE STATUS
   * ----------------------------------------------------------
   */

  const authorization = await authorizeStaffWrite(passcode);
  if (!authorization.success) {
    return { success: false, message: authorization.message ?? "Staff passcode verification failed." };
  }

  const updateResult = await (async () => {
    try {
      return await supabase
        .from("services")
        .update({
          service_status: status,
          updated_by: authorization.staffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId);
    } finally {
      await clearStaffWriteAuthorization(authorization.authorizationId);
    }
  })();
  const { error: updateError } = updateResult;

  if (updateError) {
    console.error(
      "UPDATE SERVICE STATUS FAILED:",
      updateError,
    );

    return {
      success: false,
      message:
        "Unable to update service status.",
    };
  }

  await logStaffServiceOperation({
    staffId: authorization.staffId,
    staffName: authorization.staffName,
    serviceId: service.id,
    action: authorization.actorRole === "staff" ? "STAFF_UPDATE_SERVICE_STATUS" : "ADMIN_UPDATE_SERVICE_STATUS",
    oldData: { service_status: service.service_status ?? null },
    newData: { service_status: status },
  });

  /*
   * ----------------------------------------------------------
   * READY FOR COLLECTION SMS
   * ----------------------------------------------------------
   */

  if (
    status ===
    "ready_for_collection"
  ) {
    const {
      data: payments,
      error: paymentsError,
    } = await supabase
      .from("payments")
      .select("amount")
      .eq(
        "service_id",
        serviceId,
      );

    if (paymentsError) {
      console.warn(
        "PAYMENT LOOKUP FAILED:",
        paymentsError,
      );
    }

    const amountPaid =
      payments?.reduce(
        (
          total,
          payment,
        ) =>
          total +
          Number(
            payment.amount ?? 0,
          ),
        0,
      ) ?? 0;

    const totalPrice =
      Number(
        service.total_price ??
          0,
      );

    const balance =
      Math.max(
        totalPrice -
          amountPaid,
        0,
      );

    /*
     * Supabase can return joined
     * relationships as an object
     * or array depending on schema.
     */

    const client =
      Array.isArray(
        service.client,
      )
        ? service.client[0]
        : service.client;

    const serviceType =
      Array.isArray(
        service.service_type,
      )
        ? service.service_type[0]
        : service.service_type;

    if (
      client?.phone &&
      client?.full_name
    ) {
      const smsResult =
        await sendReadyForCollectionSms({
          customerName:
            client.full_name,

          phone:
            client.phone,

          serviceName:
            serviceType?.name ??
            "Laundry Service",

          serviceDescription:
            serviceType?.description ??
            null,

          serviceId:
            service.id,

          collectionDate:
            service.collection_date,

          collectionTime:
            service.collection_time,

          numberOfItems:
            service.number_of_items,

          fulfillmentMethod:
            service.fulfillment_method,

          totalPrice,

          amountPaid,

          balance,
        });

      if (
        !smsResult.success
      ) {
        console.warn(
          "READY FOR COLLECTION SMS WAS NOT SENT:",
          smsResult.error,
        );
      } else {
        console.info(
          "READY FOR COLLECTION SMS SENT:",
          smsResult.sid,
        );
      }
    } else {
      console.warn(
        "READY SMS SKIPPED: customer phone number unavailable.",
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * CACHE
   * ----------------------------------------------------------
   */

  revalidatePath(
    `/dashboard/services/${serviceId}`,
  );

  revalidatePath(
    "/dashboard/services",
  );

  return {
    success: true,
    message:
      status ===
      "ready_for_collection"
        ? "Service marked ready for collection and customer notification processed."
        : "Service status updated.",
  };
}