"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-current-user";
import { createServiceSchema } from "@/lib/validations/service";

import { sendNewServiceSms } from "@/lib/notifications/service-sms";

export type CreateServiceState = {
  success: boolean;
  message: string;
};
    
export async function createService(
  _: CreateServiceState,
  formData: FormData,
): Promise<CreateServiceState> {
  const profile = await requireUser();
  const supabase = await createClient();

  const parsed = createServiceSchema.safeParse({
    clientId:
      formData.get("clientId")?.toString() || undefined,

    clientName: formData.get("clientName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    serviceTypeId: formData.get("serviceTypeId"),
    totalPrice: formData.get("totalPrice"),
    deposit: formData.get("deposit"),
    paymentMethod: formData.get("paymentMethod"),
    collectionDate: formData.get("collectionDate"),
    serviceDate: formData.get("serviceDate"),
    serviceTime: formData.get("serviceTime"),
    numberOfItems: formData.get("numberOfItems"),
    fulfillmentMethod: formData.get("fulfillmentMethod"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.message,
    };
  }

  const data = parsed.data;

  let clientId = data.clientId;

  /*
   * ----------------------------------------------------------
   * CLIENT
   * ----------------------------------------------------------
   */

  if (!clientId) {
    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existingError) {
      console.error(
        "CLIENT LOOKUP FAILED:",
        existingError,
      );

      return {
        success: false,
        message: "Unable to verify customer.",
      };
    }

    if (existing) {
      clientId = existing.id;
    } else {
      const {
        data: client,
        error,
      } = await supabase
        .from("clients")
        .insert({
          full_name: data.clientName,
          phone: data.phone,
          email: data.email || null,
        })
        .select("id")
        .single();

      if (error || !client) {
        console.error(
          "CLIENT CREATE FAILED:",
          error,
        );

        return {
          success: false,
          message: "Unable to create client.",
        };
      }

      clientId = client.id;
    }
  }

  /*
   * ----------------------------------------------------------
   * SERVICE
   * ----------------------------------------------------------
   */

  const {
    data: service,
    error: serviceError,
  } = await supabase
    .from("services")
    .insert({
      client_id: clientId,
      service_type_id: data.serviceTypeId,

      total_price: data.totalPrice,

      service_date: data.serviceDate,
      service_time: data.serviceTime,
      collection_date: data.collectionDate,

      number_of_items:
        data.numberOfItems || null,

      fulfillment_method:
        data.fulfillmentMethod,

      notes:
        data.notes || null,

      created_by: profile.id,
      updated_by: profile.id,
    })
    .select("id")
    .single();

  if (serviceError || !service) {
    console.error(
      "SERVICE CREATE FAILED:",
      serviceError,
    );

    return {
      success: false,
      message: "Unable to create service.",
    };
  }

  /*
   * ----------------------------------------------------------
   * PAYMENT
   * ----------------------------------------------------------
   */

  if (data.deposit > 0) {
    const {
      error: paymentError,
    } = await supabase
      .from("payments")
      .insert({
        service_id: service.id,
        amount: data.deposit,
        payment_method: data.paymentMethod,
        payment_stage: "deposit",
        received_by: profile.id,
      });

    if (paymentError) {
      console.error(
        "PAYMENT CREATE FAILED:",
        paymentError,
      );

      return {
        success: false,
        message:
          "Service created but payment failed.",
      };
    }
  }

  /*
   * ----------------------------------------------------------
   * SERVICE TYPE
   * ----------------------------------------------------------
   */

  const {
    data: serviceType,
    error: serviceTypeError,
  } = await supabase
    .from("service_types")
    .select("name, description")
    .eq("id", data.serviceTypeId)
    .maybeSingle();

  if (serviceTypeError) {
    console.warn(
      "SERVICE TYPE LOOKUP FAILED:",
      serviceTypeError,
    );
  }

  /*
   * ----------------------------------------------------------
   * SMS
   *
   * SMS failure MUST NOT fail the service.
   * ----------------------------------------------------------
   */

  const totalPrice = Number(data.totalPrice);
  const amountPaid = Number(data.deposit);

  const balance = Math.max(
    totalPrice - amountPaid,
    0,
  );

  try {
    const smsResult =
      await sendNewServiceSms({
        customerName: data.clientName,

        phone: data.phone,

        serviceName:
          serviceType?.name ??
          "Laundry Service",

        serviceDescription:
          serviceType?.description ??
          null,

        serviceId: service.id,

        serviceDate: data.serviceDate,

        collectionDate:
          data.collectionDate,

        numberOfItems:
          data.numberOfItems ?? null,

        fulfillmentMethod:
          data.fulfillmentMethod,

        totalPrice,

        amountPaid,

        balance,
      });

    if (!smsResult.success) {
      console.warn(
        "SERVICE SMS WAS NOT SENT:",
        smsResult.error,
      );
    } else {
      console.info(
        "SERVICE SMS SENT:",
        smsResult.sid,
      );
    }

    revalidatePath(
      "/dashboard/services",
    );

    return {
      success: true,
      message: smsResult.success
        ? "Service created and customer notified."
        : "Service created successfully. Customer SMS could not be sent.",
    };
  } catch (error) {
    console.error(
      "SERVICE SMS UNEXPECTED ERROR:",
      error,
    );

    revalidatePath(
      "/dashboard/services",
    );

    return {
      success: true,
      message:
        "Service created successfully. Customer SMS could not be sent.",
    };
  }
}