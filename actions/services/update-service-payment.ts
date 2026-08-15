"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-current-user";

export type UpdateServicePaymentState = {
  success: boolean;
  message: string;
};

const initialState: UpdateServicePaymentState = {
  success: false,
  message: "",
};

export async function updateServicePayment(
  serviceId: string,
  amountReceived: number,
): Promise<UpdateServicePaymentState> {
  try {
    await requireUser();

    if (!serviceId) {
      return {
        ...initialState,
        message: "Service ID is required.",
      };
    }

    if (
      !Number.isFinite(amountReceived) ||
      amountReceived <= 0
    ) {
      return {
        ...initialState,
        message:
          "Please enter a valid payment amount.",
      };
    }

    const supabase =
      await createClient();

    const {
      data: service,
      error: serviceError,
    } = await supabase
      .from("services")
      .select(
        `
          id,
          total_price,
          amount_paid,
          balance,
          payment_status
        `,
      )
      .eq("id", serviceId)
      .maybeSingle();

    if (serviceError) {
      console.error(
        "SERVICE PAYMENT LOOKUP FAILED:",
        serviceError,
      );

      return {
        ...initialState,
        message:
          "Unable to load the service payment details.",
      };
    }

    if (!service) {
      return {
        ...initialState,
        message: "Service not found.",
      };
    }

    const totalPrice = Number(
      service.total_price ?? 0,
    );

    const currentAmountPaid = Number(
      service.amount_paid ?? 0,
    );

    const currentBalance = Math.max(
      totalPrice - currentAmountPaid,
      0,
    );

    if (currentBalance <= 0) {
      return {
        ...initialState,
        message:
          "This service has already been paid in full.",
      };
    }

    if (amountReceived > currentBalance) {
      return {
        ...initialState,
        message: `Payment cannot exceed the outstanding balance of R${currentBalance.toFixed(
          2,
        )}.`,
      };
    }

    const newAmountPaid =
      currentAmountPaid +
      amountReceived;

    const newBalance = Math.max(
      totalPrice - newAmountPaid,
      0,
    );

    const newPaymentStatus =
      newBalance <= 0
        ? "paid"
        : newAmountPaid > 0
          ? "partial"
          : "unpaid";

    const {
      error: updateError,
    } = await supabase
      .from("services")
      .update({
        amount_paid: newAmountPaid,
        balance: newBalance,
        payment_status:
          newPaymentStatus,
      })
      .eq("id", serviceId);

    if (updateError) {
      console.error(
        "SERVICE PAYMENT UPDATE FAILED:",
        updateError,
      );

      return {
        ...initialState,
        message:
          "Unable to update the payment.",
      };
    }

    /*
     * Revalidate the individual service page.
     */
    revalidatePath(
      `/dashboard/services/${serviceId}`,
    );

    /*
     * Revalidate the services listing page.
     *
     * This makes the updated Paid / Balance /
     * Payment Status appear in the services table.
     */
    revalidatePath(
      "/dashboard/services",
    );

    return {
      success: true,
      message:
        newBalance <= 0
          ? "Payment received. Service is now paid in full."
          : `Payment received. R${newBalance.toFixed(
              2,
            )} remains outstanding.`,
    };
  } catch (error) {
    console.error(
      "UPDATE SERVICE PAYMENT FAILED:",
      error,
    );

    return {
      ...initialState,
      message:
        "Something went wrong while updating the payment.",
    };
  }
}