"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Truck,
} from "lucide-react";

import { updateServiceStatus } from "@/actions/services/update-service-status";

type ServiceStatus =
  | "pending"
  | "ready_for_collection"
  | "collected";

type ServiceActionsProps = {
  serviceId: string;
  status: ServiceStatus;
};

type ActionState = {
  success: boolean;
  message: string;
};

const initialState: ActionState = {
  success: false,
  message: "",
};

export default function ServiceActions({
  serviceId,
  status,
}: ServiceActionsProps) {
  const [confirming, setConfirming] =
    useState<ServiceStatus | null>(null);

  const [state, action, isPending] =
    useActionState(
      async (
        _previousState: ActionState,
        formData: FormData,
      ) => {
        const nextStatus =
          formData.get("status") as ServiceStatus;

        return updateServiceStatus(
          serviceId,
          nextStatus,
        );
      },
      initialState,
    );

  function requestStatus(
    nextStatus: ServiceStatus,
  ) {
    if (isPending) {
      return;
    }

    if (nextStatus === "collected") {
      setConfirming(nextStatus);
      return;
    }

    submitStatus(nextStatus);
  }

  function submitStatus(
    nextStatus: ServiceStatus,
  ) {
    const form =
      document.getElementById(
        `status-form-${serviceId}`,
      ) as HTMLFormElement | null;

    if (!form) {
      return;
    }

    const input =
      form.querySelector(
        'input[name="status"]',
      ) as HTMLInputElement | null;

    if (!input) {
      return;
    }

    input.value = nextStatus;

    form.requestSubmit();
  }

  function cancelConfirmation() {
    if (isPending) {
      return;
    }

    setConfirming(null);
  }

  return (
    <div className="space-y-4">
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

      {status === "pending" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            requestStatus(
              "ready_for_collection",
            )
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}

          {isPending
            ? "Updating..."
            : "Mark ready for collection"}
        </button>
      )}

      {status === "ready_for_collection" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            requestStatus("collected")
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Truck className="h-4 w-4" />

          Mark as collected
        </button>
      )}

      {status === "collected" && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />

          Service completed
        </div>
      )}

      <form
        id={`status-form-${serviceId}`}
        action={action}
        className="hidden"
      >
        <input
          type="hidden"
          name="status"
          defaultValue={status}
        />
      </form>

      {confirming === "collected" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-confirmation-title"
            className="w-full max-w-sm rounded-3xl border border-black/[0.06] bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <h3
              id="collection-confirmation-title"
              className="mt-5 text-base font-semibold text-neutral-950"
            >
              Mark service as collected?
            </h3>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              This will mark the laundry
              service as completed.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={cancelConfirmation}
                className="h-11 rounded-xl border border-black/[0.07] text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  submitStatus("collected")
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                {isPending
                  ? "Updating..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}