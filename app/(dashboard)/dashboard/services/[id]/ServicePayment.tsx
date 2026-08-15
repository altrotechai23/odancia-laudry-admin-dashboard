"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  Banknote,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";
import { updateServicePayment } from "@/actions/services/update-service-payment";



type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid";

type ServicePaymentProps = {
  serviceId: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
};

const initialState = {
  success: false,
  message: "",
};

export default function ServicePayment({
  serviceId,
  total,
  amountPaid,
  balance,
  paymentStatus,
}: ServicePaymentProps) {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    state,
    action,
    isPending,
  ] = useActionState(
    async (
      _previousState: typeof initialState,
      formData: FormData,
    ) => {
      const rawAmount =
        String(
          formData.get(
            "amount",
          ) ?? "",
        ).trim();

      const numericAmount =
        Number(rawAmount);

      const result =
        await updateServicePayment(
          serviceId,
          numericAmount,
        );

      /*
       * The server has already updated
       * and revalidated the pages.
       *
       * Tell the browser to refresh the
       * current server-rendered page after
       * a successful payment.
       */
      if (result.success) {
        window.location.reload();
      }

      return result;
    },
    initialState,
  );

  const numericAmount =
    Number(amount);

  const previewBalance =
    Number.isFinite(
      numericAmount,
    ) &&
    numericAmount > 0
      ? Math.max(
          balance - numericAmount,
          0,
        )
      : balance;

  function openEditor() {
    setAmount("");
    setIsOpen(true);
  }

  function closeEditor() {
    if (isPending) {
      return;
    }

    setAmount("");
    setIsOpen(false);
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      event.preventDefault();
      return;
    }

    if (
      numericAmount > balance
    ) {
      event.preventDefault();
      return;
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Total
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {formatCurrency(total)}
          </p>
        </div>

        <div className="space-y-3">
          <MoneyRow
            label="Paid"
            value={formatCurrency(
              amountPaid,
            )}
          />

          <MoneyRow
            label="Outstanding"
            value={formatCurrency(
              balance,
            )}
            emphasis={
              balance > 0
            }
          />
        </div>

        {state.message && (
          <div
            className={`rounded-xl px-3 py-2 text-xs ${
              state.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {state.message}
          </div>
        )}

        <PaymentBadge
          status={paymentStatus}
        />

        {balance > 0 ? (
          <button
            type="button"
            onClick={openEditor}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />

            Record payment
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />

            Paid in full
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-black/[0.06] bg-white p-6 shadow-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Banknote className="h-5 w-5" />
            </div>

            <h3 className="mt-5 text-base font-semibold text-neutral-950">
              Record payment
            </h3>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Enter the amount received
              from the customer.
            </p>

            <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-500">
                  Outstanding
                </span>

                <span className="text-sm font-semibold text-amber-700">
                  {formatCurrency(
                    balance,
                  )}
                </span>
              </div>
            </div>

            <form
              action={action}
              onSubmit={
                handleSubmit
              }
              className="mt-5"
            >
              <label
                htmlFor={`payment-${serviceId}`}
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400"
              >
                Amount received
              </label>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                  R
                </span>

                <input
                  id={`payment-${serviceId}`}
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max={balance}
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  placeholder="0.00"
                  disabled={isPending}
                  autoFocus
                  className="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-4 text-sm font-medium text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950 focus:ring-4 focus:ring-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {numericAmount > 0 &&
                numericAmount <=
                  balance && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
                    <span className="text-xs text-neutral-500">
                      Remaining after payment
                    </span>

                    <span className="text-xs font-semibold text-neutral-950">
                      {formatCurrency(
                        previewBalance,
                      )}
                    </span>
                  </div>
                )}

              {numericAmount >
                balance && (
                <p className="mt-2 text-xs text-red-600">
                  Payment cannot exceed{" "}
                  {formatCurrency(
                    balance,
                  )}
                  .
                </p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={
                    closeEditor
                  }
                  disabled={
                    isPending
                  }
                  className="h-11 rounded-xl border border-black/[0.07] text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !Number.isFinite(
                      numericAmount,
                    ) ||
                    numericAmount <=
                      0 ||
                    numericAmount >
                      balance
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  Save payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


/* ============================================================
   MONEY ROW
============================================================ */

function MoneyRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-neutral-500">
        {label}
      </span>

      <span
        className={`text-sm font-semibold ${
          emphasis
            ? "text-amber-700"
            : "text-neutral-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}


/* ============================================================
   PAYMENT BADGE
============================================================ */

function PaymentBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const config = {
    unpaid: {
      label: "Payment outstanding",
      className:
        "bg-red-50 text-red-600 ring-red-600/10",
    },

    partial: {
      label: "Partially paid",
      className:
        "bg-amber-50 text-amber-700 ring-amber-600/10",
    },

    paid: {
      label: "Paid in full",
      className:
        "bg-emerald-50 text-emerald-600 ring-emerald-600/10",
    },
  } as const;

  const item =
    config[status] ??
    config.unpaid;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}
    >
      {status === "paid" ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Banknote className="h-3 w-3" />
      )}

      {item.label}
    </span>
  );
}


/* ============================================================
   CURRENCY
============================================================ */

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-ZA",
    {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}