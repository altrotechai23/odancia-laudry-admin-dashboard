"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { authorizeStaffWrite, clearStaffWriteAuthorization, logStaffServiceOperation } from "@/lib/staff/security";

export type PaymentEntry = {
  amount: number;
  paymentMethod: string;
};

export type UpdateServicePaymentState = {
  success: boolean;
  message: string;
};

const initialState: UpdateServicePaymentState = {
  success: false,
  message: "",
};

const ALLOWED_PAYMENT_METHODS = new Set([
  "cash",
  "eft",
  "card",
  "other",
]);

/**
 * Record one or more payment transactions through the database RPC.
 * The RPC validates the outstanding balance again and inserts the entire
 * split-payment batch in one database transaction. Existing payment triggers
 * remain responsible for recalculating the service totals.
 */
export async function updateServicePayment(
  serviceId: string,
  entries: PaymentEntry[],
  passcode = "",
): Promise<UpdateServicePaymentState> {
  try {
    await requireOwnerOrAdmin();

    if (!serviceId) {
      return { ...initialState, message: "Service ID is required." };
    }

    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 4) {
      return { ...initialState, message: "Add between one and four payment methods." };
    }

    const normalizedEntries = entries.map((entry) => ({
      amount: Number(entry.amount),
      paymentMethod: String(entry.paymentMethod ?? "").trim().toLowerCase(),
    }));

    for (const entry of normalizedEntries) {
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
        return { ...initialState, message: "Every payment amount must be greater than zero." };
      }
      if (!ALLOWED_PAYMENT_METHODS.has(entry.paymentMethod)) {
        return { ...initialState, message: "Choose a valid payment method for each payment." };
      }
    }

    const totalReceived = Math.round(
      normalizedEntries.reduce((sum, entry) => sum + entry.amount, 0) * 100,
    ) / 100;

    if (totalReceived <= 0) {
      return { ...initialState, message: "Enter a valid payment total." };
    }

    const staffAuthorization = await authorizeStaffWrite(passcode);
    if (!staffAuthorization.success) {
      return { ...initialState, message: staffAuthorization.message ?? "Staff passcode verification failed." };
    }

    const supabase = await createClient();
    const paymentResult = await (async () => {
      try {
        const rpcResult = await supabase.rpc("odancia_record_service_payments", {
          p_service_id: serviceId,
          p_amounts: normalizedEntries.map((entry) => Math.round(entry.amount * 100) / 100),
          p_methods: normalizedEntries.map((entry) => entry.paymentMethod),
          p_received_by: staffAuthorization.staffId,
        });
        if (!rpcResult.error) {
          await logStaffServiceOperation({
            staffId: staffAuthorization.staffId,
            staffName: staffAuthorization.staffName,
            serviceId,
            action: staffAuthorization.actorRole === "staff" ? "STAFF_RECORD_PAYMENT_BATCH" : "ADMIN_RECORD_PAYMENT_BATCH",
            oldData: null,
            newData: {
              transaction_count: normalizedEntries.length,
              total_received: totalReceived,
              payment_methods: normalizedEntries.map((entry) => entry.paymentMethod),
            },
          });
        }
        return rpcResult;
      } finally {
        await clearStaffWriteAuthorization(staffAuthorization.authorizationId);
      }
    })();
    const { data, error } = paymentResult;

    if (error) {
      console.error("PAYMENT LEDGER RPC FAILED:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      const rawMessage = String(error.message ?? "").trim();
      const normalizedMessage = rawMessage.toLowerCase();
      let message: string;

      if (normalizedMessage.includes("balance") || normalizedMessage.includes("outstanding")) {
        message = "The payment total exceeds the outstanding balance. Refresh the service and try again.";
      } else if (
        error.code === "PGRST202" ||
        error.code === "42883" ||
        normalizedMessage.includes("could not find the function") ||
        normalizedMessage.includes("function public.odancia_record_service_payments")
      ) {
        message = "The payment database function is missing or outdated. Apply the latest Odancia payment-fix SQL migration in Supabase, then try again.";
      } else if (error.code === "42501") {
        message = rawMessage || "The database rejected the payment authorization. Re-enter 0000 or an active on-duty staff code.";
      } else if (rawMessage) {
        // Surface the actual Postgres message to the signed-in admin; the server log
        // retains code/details/hint for support without ever logging the entered code.
        message = `Payment was not saved: ${rawMessage}`;
      } else {
        message = "Payment was not saved. No payment batch was written; check the server log for the database error.";
      }
      return { ...initialState, message };
    }

    const remaining = Number(
      (data as { remaining_balance?: number } | null)?.remaining_balance,
    );

    revalidatePath(`/dashboard/services/${serviceId}`);
    revalidatePath("/dashboard/services");
    revalidatePath("/dashboard/payments");

    return {
      success: true,
      message: Number.isFinite(remaining)
        ? remaining <= 0
          ? "Payment recorded. Service is now paid in full."
          : `Payment recorded. R${remaining.toFixed(2)} remains outstanding.`
        : `Recorded ${normalizedEntries.length} payment transaction${normalizedEntries.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    console.error("UPDATE SERVICE PAYMENT FAILED:", error);
    return { ...initialState, message: "Something went wrong while recording the payment." };
  }
}
