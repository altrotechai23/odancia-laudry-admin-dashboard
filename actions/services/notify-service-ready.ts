"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-current-user";

import {
  sendReadyForCollectionSms,
} from "@/lib/notifications/service-sms";

export type NotifyServiceReadyResult = {
  success: boolean;
  message: string;
};

export async function notifyServiceReady(
  serviceId: string,
): Promise<NotifyServiceReadyResult> {
  await requireUser();

  const supabase =
    await createClient();

  const {
    data: service,
    error,
  } = await supabase
    .from("services")
    .select(
      `
        id,
        collection_date,
        number_of_items,
        fulfillment_method,
        total_price,
        clients (
          full_name,
          phone
        ),
        service_types (
          name,
          description
        )
      `,
    )
    .eq(
      "id",
      serviceId,
    )
    .single();

  if (error || !service) {
    console.error(
      "READY SMS SERVICE LOAD FAILED:",
      error,
    );

    return {
      success: false,
      message:
        "Unable to load service.",
    };
  }

  const client =
    Array.isArray(service.clients)
      ? service.clients[0]
      : service.clients;

  const serviceType =
    Array.isArray(
      service.service_types,
    )
      ? service.service_types[0]
      : service.service_types;

  if (!client?.phone) {
    return {
      success: false,
      message:
        "Customer has no phone number.",
    };
  }

  // --------------------------------------------------
  // CALCULATE PAYMENTS
  // --------------------------------------------------

  const {
    data: payments,
  } = await supabase
    .from("payments")
    .select("amount")
    .eq(
      "service_id",
      service.id,
    );

  const amountPaid =
    (payments ?? []).reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0,
    );

  const totalPrice =
    Number(
      service.total_price || 0,
    );

  const balance =
    Math.max(
      totalPrice -
        amountPaid,
      0,
    );

  // --------------------------------------------------
  // SEND SMS
  // --------------------------------------------------

  const result =
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

      numberOfItems:
        service.number_of_items,

      fulfillmentMethod:
        service.fulfillment_method,

      totalPrice,

      amountPaid,

      balance,
    });

  if (!result.success) {
    return {
      success: false,
      message:
        result.error ??
        "Unable to send SMS.",
    };
  }

  return {
    success: true,
    message:
      "Customer has been notified.",
  };
}