"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  updateServicePayment,
  type PaymentEntry,
} from "@/actions/services/update-service-payment";
import type { ServicePaymentTransaction } from "@/lib/services/get-services";

type PaymentStatus = "unpaid" | "partial" | "paid";

type ServicePaymentProps = {
  serviceId: string;
  total: number;
  amountPaid: number;
  serviceTypeName: string | null;
  paymentHistory: ServicePaymentTransaction[];
};

const initialState = { success: false, message: "" };
type PaymentRow = { id: number; amount: string; method: string };

export default function ServicePayment({
  serviceId,
  total,
  amountPaid,
  serviceTypeName,
  paymentHistory,
}: ServicePaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [staffPasscode, setStaffPasscode] = useState("");
  const [rows, setRows] = useState<PaymentRow[]>([
    { id: 1, amount: "", method: "cash" },
  ]);
  const [nextId, setNextId] = useState(2);

  const safeTotal = Math.max(0, Number(total) || 0);
  const savedAmountPaid = Math.max(0, Number(amountPaid) || 0);
  const ledgerAmountPaid = paymentHistory.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.amount) || 0),
    0,
  );
  const safeAmountPaid = paymentHistory.length > 0 ? ledgerAmountPaid : savedAmountPaid;
  // Derive the balance from total minus payments. The stored balance can be
  // stale (especially for services created with no deposit/payment row).
  const outstanding = Math.max(0, Math.round((safeTotal - safeAmountPaid) * 100) / 100);
  const enteredTotal = useMemo(
    () => Math.round(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) * 100) / 100,
    [rows],
  );
  const allRowsValid = rows.every((row) => {
    const value = Number(row.amount);
    return row.amount.trim() !== "" && Number.isFinite(value) && value > 0 &&
      ["cash", "eft", "card", "other"].includes(row.method);
  });
  const validBatch = allRowsValid && enteredTotal > 0 && enteredTotal <= outstanding &&
    /^\d{4}$/.test(staffPasscode);

  const status: PaymentStatus = outstanding <= 0
    ? "paid"
    : safeAmountPaid > 0
      ? "partial"
      : "unpaid";

  const [state, action, isPending] = useActionState(
    async (_previousState: typeof initialState, formData: FormData) => {
      const amounts = formData.getAll("payment_amount");
      const methods = formData.getAll("payment_method");
      const entries: PaymentEntry[] = amounts.map((amount, index) => ({
        amount: Number(String(amount)),
        paymentMethod: String(methods[index] ?? "cash"),
      }));
      if (entries.length !== rows.length || !validBatch) {
        setStaffPasscode("");
        return { success: false, message: "Enter valid payment amounts, a total within the outstanding balance, and 0000 for the logged-in admin or a valid on-duty staff code." };
      }
      const result = await updateServicePayment(serviceId, entries, staffPasscode);
      setStaffPasscode("");
      if (result.success) window.location.reload();
      return result;
    },
    initialState,
  );

  function openEditor() {
    setRows([{ id: 1, amount: "", method: "cash" }]);
    setNextId(2);
    setStaffPasscode("");
    setIsOpen(true);
  }

  function closeEditor() {
    if (!isPending) {
      setIsOpen(false);
      setStaffPasscode("");
    }
  }

  function updateRow(id: number, patch: Partial<PaymentRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function addRow() {
    if (rows.length >= 4) return;
    setRows((current) => [...current, { id: nextId, amount: "", method: "eft" }]);
    setNextId((value) => value + 1);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Total</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{formatCurrency(safeTotal)}</p>
        </div>
        <div className="space-y-3">
          <MoneyRow label="Paid" value={formatCurrency(safeAmountPaid)} />
          <MoneyRow label="Outstanding" value={formatCurrency(outstanding)} emphasis={outstanding > 0} />
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-neutral-900">Payment history</p>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">{serviceTypeName || "Laundry service"}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-800">{paymentHistory.length} {paymentHistory.length === 1 ? "transaction" : "transactions"}</span>
          </div>
          {paymentHistory.length === 0 ? (
            <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">No payments recorded yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-neutral-100">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900">{paymentMethodLabel(payment.payment_method)}</p>
                      <p className="mt-1 text-[10px] text-neutral-500">{paymentStageLabel(payment.payment_stage)}{payment.paid_at ? ` · ${formatPaymentDate(payment.paid_at)}` : ` · ${formatPaymentDate(payment.created_at)}`}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-neutral-950">{formatCurrency(payment.amount)}</p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-neutral-500">
                    Received by <span className="font-semibold text-neutral-700">{payment.received_by_name ?? "Operator not recorded"}</span>
                    {payment.received_by_role ? ` · ${roleLabel(payment.received_by_role)}` : ""}
                  </p>
                  {payment.reference && <p className="mt-1 text-[10px] text-neutral-400">Reference: {payment.reference}</p>}
                  {payment.notes && <p className="mt-1 text-[10px] leading-4 text-neutral-400">{payment.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {state.message && <div role="status" className={`rounded-xl px-3 py-2 text-xs ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{state.message}</div>}
        <PaymentBadge status={status} />
        {outstanding > 0 ? (
          <button type="button" onClick={openEditor} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-900">
            <Plus className="h-4 w-4" /> Record payment
          </button>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Paid in full</div>
        )}
      </div>

      {isOpen && outstanding > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-black/[0.06] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-800 text-white"><Banknote className="h-5 w-5" /></div>
            <h3 id="payment-dialog-title" className="mt-4 text-base font-semibold text-blue-950">Record payment</h3>
            <p className="mt-1 text-sm leading-6 text-neutral-500">Record one payment or split it across different methods.</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-neutral-50 p-4">
              <span className="text-xs text-neutral-500">Outstanding balance</span>
              <span className="text-sm font-semibold text-amber-700">{formatCurrency(outstanding)}</span>
            </div>

            <form action={action} className="mt-5" onSubmit={(event) => { if (!validBatch || isPending) event.preventDefault(); }}>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={row.id} className="rounded-2xl border border-neutral-200 p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700">Payment {index + 1}</span>
                      {rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} disabled={isPending} aria-label={`Remove payment ${index + 1}`} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    <label htmlFor={`payment-amount-${serviceId}-${row.id}`} className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Amount received</label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">R</span>
                      <input id={`payment-amount-${serviceId}-${row.id}`} name="payment_amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={row.amount} onChange={(event) => updateRow(row.id, { amount: event.target.value })} required disabled={isPending} placeholder="0.00" className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-4 text-sm font-medium text-neutral-950 outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <label htmlFor={`payment-method-${serviceId}-${row.id}`} className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Payment method</label>
                    <select id={`payment-method-${serviceId}-${row.id}`} name="payment_method" value={row.method} onChange={(event) => updateRow(row.id, { method: event.target.value })} disabled={isPending} className="mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-neutral-950 outline-none focus:border-blue-500 disabled:opacity-50">
                      <option value="cash">Cash</option><option value="eft">EFT / bank transfer</option><option value="card">Card</option><option value="other">Other</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:p-4">
                <label htmlFor={`staff-payment-passcode-${serviceId}`} className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-900">Admin code (0000) or on-duty staff code</label>
                <input id={`staff-payment-passcode-${serviceId}`} type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} value={staffPasscode} onChange={(event) => setStaffPasscode(event.target.value.replace(/\D/g, "").slice(0, 4))} required disabled={isPending} placeholder="Enter four digits" className="mt-2 h-11 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm tracking-[0.35em] text-slate-950 outline-none focus:border-blue-500 disabled:opacity-50" />
                <p className="mt-2 text-[11px] leading-5 text-blue-900/70">Use 0000 to attribute this payment to the currently logged-in admin, or use an active staff member’s unique code while they are clocked in. Viewing payment details does not require a code.</p>
              </div>

              {state.message && !state.success && <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{state.message}</div>}

              {rows.length < 4 && <button type="button" onClick={addRow} disabled={isPending} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"><Plus className="h-4 w-4" /> Add another method</button>}

              <div className={`mt-4 flex items-center justify-between rounded-xl px-3 py-3 ${enteredTotal > outstanding ? "bg-red-50" : "bg-neutral-50"}`}>
                <span className="text-xs text-neutral-500">Payment total</span>
                <span className={`text-sm font-semibold ${enteredTotal > outstanding ? "text-red-600" : "text-neutral-950"}`}>{formatCurrency(enteredTotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-xs text-neutral-500">Remaining after payment</span>
                <span className="text-xs font-semibold text-neutral-950">{formatCurrency(Math.max(0, outstanding - enteredTotal))}</span>
              </div>
              {enteredTotal > outstanding && <p className="mt-2 text-xs text-red-600">Combined payments cannot exceed {formatCurrency(outstanding)}.</p>}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button type="button" onClick={closeEditor} disabled={isPending} className="h-11 rounded-xl border border-black/[0.07] text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={!validBatch || isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-800 text-xs font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">{isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save payment{rows.length > 1 ? "s" : ""}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function paymentMethodLabel(method: string) {
  switch (method.toLowerCase()) {
    case "cash": return "Cash";
    case "eft": return "EFT / bank transfer";
    case "card": return "Card";
    default: return "Other";
  }
}

function paymentStageLabel(stage: string | null) {
  switch ((stage ?? "").toLowerCase()) {
    case "deposit": return "Deposit";
    case "final": return "Final payment";
    case "partial": return "Partial payment";
    case "paid": return "Payment";
    default: return "Payment";
  }
}

function roleLabel(role: "owner" | "admin" | "staff") {
  return role === "staff" ? "Staff" : role === "owner" ? "Owner" : "Admin";
}

function formatPaymentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function MoneyRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-xs text-neutral-500">{label}</span><span className={`text-sm font-semibold ${emphasis ? "text-amber-700" : "text-neutral-900"}`}>{value}</span></div>;
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config = {
    unpaid: { label: "Payment outstanding", className: "bg-red-50 text-red-600 ring-red-600/10" },
    partial: { label: "Partially paid", className: "bg-amber-50 text-amber-700 ring-amber-600/10" },
    paid: { label: "Paid in full", className: "bg-emerald-50 text-emerald-600 ring-emerald-600/10" },
  } as const;
  const item = config[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}>{status === "paid" ? <CheckCircle2 className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}{item.label}</span>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
