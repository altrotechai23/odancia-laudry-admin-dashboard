
"use client";

import { useActionState, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Plus,
} from "lucide-react";

import { updateServicePayment } from "@/actions/services/update-service-payment";

type PaymentStatus = "unpaid" | "partial" | "paid";

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
}: ServicePaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");

  // Always derive the displayed balance from the total and
  // the actual amount paid. Do not trust a stale saved balance.
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeAmountPaid = Math.max(0, Number(amountPaid) || 0);

  const outstanding = Math.max(
    0,
    safeTotal - safeAmountPaid,
  );

  // Derive the badge and button from the same payment calculation.
  const calculatedPaymentStatus: PaymentStatus =
    outstanding === 0
      ? "paid"
      : safeAmountPaid > 0
        ? "partial"
        : "unpaid";

  const [
    state,
    action,
    isPending,
  ] = useActionState(
    async (
      _previousState: typeof initialState,
      formData: FormData,
    ) => {
      const rawAmount = String(
        formData.get("amount") ?? "",
      ).trim();

      const numericAmount = Number(rawAmount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0 ||
        numericAmount > outstanding
      ) {
        return {
          success: false,
          message: "Enter a valid payment amount within the outstanding balance.",
        };
      }

      const result = await updateServicePayment(
        serviceId,
        numericAmount,
      );

      if (result.success) {
        window.location.reload();
      }

      return result;
    },
    initialState,
  );

  const numericAmount = Number(amount);

  const validAmount =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= outstanding;

  const previewBalance = Math.max(
    0,
    outstanding - numericAmount,
  );

  function openEditor() {
    setAmount("");
    setIsOpen(true);
  }

  function closeEditor() {
    if (isPending) return;

    setAmount("");
    setIsOpen(false);
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    if (!validAmount || isPending) {
      event.preventDefault();
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Total */}
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Total
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {formatCurrency(safeTotal)}
          </p>
        </div>

        {/* Payment breakdown */}
        <div className="space-y-3">
          <MoneyRow
            label="Paid"
            value={formatCurrency(safeAmountPaid)}
          />

          <MoneyRow
            label="Outstanding"
            value={formatCurrency(outstanding)}
            emphasis={outstanding > 0}
          />
        </div>

        {/* Action feedback */}
        {state.message && (
          <div
            role="status"
            className={`rounded-xl px-3 py-2 text-xs ${
              state.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {state.message}
          </div>
        )}

        {/* Badge and button now share one source of truth */}
        <PaymentBadge status={calculatedPaymentStatus} />

        {outstanding > 0 ? (
          <button
            type="button"
            onClick={openEditor}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            Record payment
          </button>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Paid in full
          </div>
        )}
      </div>

      {/* Payment modal */}
      {isOpen && outstanding > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-dialog-title"
            className="w-full max-w-sm rounded-3xl border border-black/[0.06] bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Banknote className="h-5 w-5" />
            </div>

            <h3
              id="payment-dialog-title"
              className="mt-5 text-base font-semibold text-neutral-950"
            >
              Record payment
            </h3>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Enter the amount received from the customer.
            </p>

            <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-500">
                  Outstanding
                </span>

                <span className="text-sm font-semibold text-amber-700">
                  {formatCurrency(outstanding)}
                </span>
              </div>
            </div>

            <form
              action={action}
              onSubmit={handleSubmit}
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
                  max={outstanding}
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="0.00"
                  disabled={isPending}
                  autoFocus
                  required
                  className="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-4 text-sm font-medium text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950 focus:ring-4 focus:ring-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {amount.trim() !== "" && validAmount && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5">
                  <span className="text-xs text-neutral-500">
                    Remaining after payment
                  </span>

                  <span className="text-xs font-semibold text-neutral-950">
                    {formatCurrency(previewBalance)}
                  </span>
                </div>
              )}

              {amount.trim() !== "" &&
                Number.isFinite(numericAmount) &&
                numericAmount > outstanding && (
                  <p className="mt-2 text-xs text-red-600">
                    Payment cannot exceed{" "}
                    {formatCurrency(outstanding)}.
                  </p>
                )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={isPending}
                  className="h-11 rounded-xl border border-black/[0.07] text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!validAmount || isPending}
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
          emphasis ? "text-amber-700" : "text-neutral-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PaymentBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  const config = {
    unpaid: {
      label: "Payment outstanding",
      className: "bg-red-50 text-red-600 ring-red-600/10",
    },
    partial: {
      label: "Partially paid",
      className: "bg-amber-50 text-amber-700 ring-amber-600/10",
    },
    paid: {
      label: "Paid in full",
      className: "bg-emerald-50 text-emerald-600 ring-emerald-600/10",
    },
  } as const;

  const item = config[status];

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
