"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createServiceSchema } from "@/lib/validations/service";
import { authorizeStaffWrite, clearStaffWriteAuthorization, logStaffServiceOperation } from "@/lib/staff/security";

import { sendNewServiceSms } from "@/lib/notifications/service-sms";

export type CreateServiceState = {
  success: boolean;
  message: string;
};
    
export async function createService(
  _: CreateServiceState,
  formData: FormData,
): Promise<CreateServiceState> {
  await requireOwnerOrAdmin();
  const supabase = await createClient();

  const parsed = createServiceSchema.safeParse({
    clientId:
      formData.get("clientId")?.toString() || undefined,

    clientName: formData.get("clientName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    serviceTypeId: formData.get("serviceTypeId"),
    basePrice: formData.get("basePrice"),
    totalPrice: formData.get("totalPrice"),
    isExpress: formData.get("isExpress") === "on",
    deposit: formData.get("deposit"),
    paymentMethod: formData.get("paymentMethod"),
    collectionDate: formData.get("collectionDate"),
    collectionTime: formData.get("collectionTime"),
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

  const staffAuthorization = await authorizeStaffWrite(formData.get("staff_passcode"));
  if (!staffAuthorization.success) {
    return { success: false, message: staffAuthorization.message ?? "Staff passcode verification failed." };
  }

  try {
    if (data.deposit > data.totalPrice) {
      return { success: false, message: "The deposit cannot exceed the final service price." };
    }

    if (data.isExpress && Math.round(data.totalPrice * 100) !== Math.round(data.basePrice * 200)) {
      return { success: false, message: "Express service must be priced at exactly double the agreed base price." };
    }

    if (!data.isExpress && Math.round(data.totalPrice * 100) !== Math.round(data.basePrice * 100)) {
      return { success: false, message: "The service total does not match the agreed price." };
    }

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
        base_price: data.basePrice,
        // Initialize the service correctly even when no deposit is collected.
        // The payments trigger will replace these values after a deposit is inserted.
        deposit_amount: 0,
        amount_paid: 0,
        balance: data.totalPrice,
        payment_status: data.totalPrice <= 0 ? "paid" : "unpaid",
        is_express: data.isExpress,
        express_earliest_at: data.isExpress
          ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          : null,
        expected_completion_at: data.isExpress
          ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          : null,

        service_date: data.serviceDate,
        service_time: data.serviceTime,
        collection_date: data.collectionDate,
        collection_time: data.collectionTime,

        number_of_items:
          data.numberOfItems || null,

        fulfillment_method:
          data.fulfillmentMethod,

        notes:
          data.notes || null,

        created_by: staffAuthorization.staffId,
        updated_by: staffAuthorization.staffId,
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

    await logStaffServiceOperation({
      staffId: staffAuthorization.staffId,
      staffName: staffAuthorization.staffName,
      serviceId: service.id,
      action: staffAuthorization.actorRole === "staff" ? "STAFF_CREATE_SERVICE" : "ADMIN_CREATE_SERVICE",
      oldData: null,
      newData: {
        client_id: clientId,
        service_type_id: data.serviceTypeId,
        total_price: data.totalPrice,
        base_price: data.basePrice,
        is_express: data.isExpress,
      },
    });

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
          received_by: staffAuthorization.staffId,
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

      // The existing payment trigger updates service totals and may attribute
      // the row to the signed-in admin. Restore the actual on-duty staff actor.
      const { error: attributionError } = await supabase
        .from("services")
        .update({ updated_by: staffAuthorization.staffId, updated_at: new Date().toISOString() })
        .eq("id", service.id);
      if (attributionError) console.warn("SERVICE CREATION ATTRIBUTION UPDATE FAILED:", attributionError.message);
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
          collectionTime: data.collectionTime,

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
  } finally {
    await clearStaffWriteAuthorization(staffAuthorization.authorizationId);
  }
}
