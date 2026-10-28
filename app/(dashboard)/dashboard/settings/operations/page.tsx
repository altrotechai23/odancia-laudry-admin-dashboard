import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  DollarSign,
  PackageCheck,
  Save,
  Settings2,
  Truck,
  WalletCards,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type OperationsSettings = {
  id: string;

  default_fulfillment_method:
    | "pickup"
    | "delivery";

  collection_enabled: boolean;
  delivery_enabled: boolean;

  default_collection_days: number;

  delivery_fee: number;

  deposit_enabled: boolean;
  default_deposit_percentage: number;

  updated_at: string | null;
};

const DEFAULT_SETTINGS: OperationsSettings = {
  id: "",

  default_fulfillment_method: "pickup",

  collection_enabled: true,
  delivery_enabled: true,

  default_collection_days: 2,

  delivery_fee: 0,

  deposit_enabled: true,
  default_deposit_percentage: 50,

  updated_at: null,
};

export default async function OperationsSettingsPage() {
  const currentUser = await requireOwnerOrAdmin();

  const settings = await getOperationsSettings();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">

        {/* ======================================================
            BACK
        ====================================================== */}

        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 transition hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to settings
        </Link>

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="mt-6">
          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-800 text-white">
              <Settings2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Settings</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Operations</span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Operations
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Configure the default workflow, collection,
                delivery, and payment behavior for your
                laundry operations.
              </p>

            </div>
          </div>
        </header>

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          action={updateOperationsSettings}
          className="mt-7 space-y-5"
        >

          {/* ====================================================
              SERVICE WORKFLOW
          ==================================================== */}

          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

            <SectionHeader
              icon={
                <PackageCheck className="h-4 w-4" />
              }
              title="Service workflow"
              description="Default behavior when new laundry services are created."
            />

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">

              <SelectField
                label="Default fulfillment"
                name="default_fulfillment_method"
                defaultValue={
                  settings.default_fulfillment_method
                }
                icon={
                  <Truck className="h-3.5 w-3.5" />
                }
                options={[
                  {
                    value: "pickup",
                    label: "Customer pickup",
                  },
                  {
                    value: "delivery",
                    label: "Delivery",
                  },
                ]}
              />

              <NumberField
                label="Default collection period"
                name="default_collection_days"
                defaultValue={
                  settings.default_collection_days
                }
                min={0}
                max={30}
                suffix="days"
                icon={
                  <CalendarDays className="h-3.5 w-3.5" />
                }
              />

            </div>
          </section>

          {/* ====================================================
              COLLECTION & DELIVERY
          ==================================================== */}

          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

            <SectionHeader
              icon={
                <Truck className="h-4 w-4" />
              }
              title="Collection & delivery"
              description="Control which fulfillment options are available to staff."
            />

            <div className="divide-y divide-black/[0.05]">

              <ToggleRow
                name="collection_enabled"
                label="Customer collection"
                description="Allow customers to collect completed laundry."
                defaultChecked={
                  settings.collection_enabled
                }
                icon={
                  <PackageCheck className="h-4 w-4" />
                }
              />

              <ToggleRow
                name="delivery_enabled"
                label="Laundry delivery"
                description="Allow services to be fulfilled through delivery."
                defaultChecked={
                  settings.delivery_enabled
                }
                icon={
                  <Truck className="h-4 w-4" />
                }
              />

            </div>

            <div className="border-t border-black/[0.06] p-5 sm:p-6">

              <NumberField
                label="Delivery fee"
                name="delivery_fee"
                defaultValue={
                  settings.delivery_fee
                }
                min={0}
                max={100000}
                step="0.01"
                prefix="R"
                icon={
                  <DollarSign className="h-3.5 w-3.5" />
                }
              />

            </div>
          </section>

          {/* ====================================================
              PAYMENTS
          ==================================================== */}

          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">

            <SectionHeader
              icon={
                <WalletCards className="h-4 w-4" />
              }
              title="Payment defaults"
              description="Configure how payments are handled when services are created."
            />

            <div className="divide-y divide-black/[0.05]">

              <ToggleRow
                name="deposit_enabled"
                label="Require deposits"
                description="Allow a deposit to be recorded when creating a service."
                defaultChecked={
                  settings.deposit_enabled
                }
                icon={
                  <WalletCards className="h-4 w-4" />
                }
              />

            </div>

            <div className="border-t border-black/[0.06] p-5 sm:p-6">

              <NumberField
                label="Default deposit percentage"
                name="default_deposit_percentage"
                defaultValue={
                  settings.default_deposit_percentage
                }
                min={0}
                max={100}
                step="1"
                suffix="%"
                icon={
                  <DollarSign className="h-3.5 w-3.5" />
                }
              />

              <p className="mt-2 text-[11px] leading-5 text-neutral-400">
                This percentage is used as the default
                deposit when a new service is created.
              </p>

            </div>
          </section>

          {/* ====================================================
              QUICK SUMMARY
          ==================================================== */}

          <section className="rounded-3xl border border-black/[0.06] bg-neutral-50/70 p-5 sm:p-6">

            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-700 shadow-sm ring-1 ring-black/[0.05]">
                <Clock3 className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-neutral-950">
                  Operational defaults
                </h2>

                <p className="mt-1 max-w-xl text-[11px] leading-5 text-neutral-400">
                  These settings act as defaults for new
                  services. Staff can still adjust individual
                  service details when necessary.
                </p>
              </div>

            </div>

          </section>

          {/* ====================================================
              ACTIONS
          ==================================================== */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="text-[11px] text-neutral-400">

              {settings.updated_at
                ? `Last updated ${formatDateTime(
                    settings.updated_at,
                  )}`
                : "Operations settings have not been updated yet."}

            </div>

            <div className="flex gap-3">

              <Link
                href="/dashboard/settings"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 text-xs font-semibold text-white transition hover:bg-blue-900 active:scale-[0.99]"
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </button>

            </div>
          </div>
        </form>

        {/* ======================================================
            FOOTER
        ====================================================== */}

        <footer className="mt-6 pb-6 text-[11px] text-neutral-400">
          Signed in as{" "}
          {currentUser.phone ?? "Administrator"}.
        </footer>

      </div>
    </main>
  );
}

/* ==============================================================
   DATA
============================================================== */

async function getOperationsSettings(): Promise<OperationsSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("operations_settings")
    .select(
      `
        id,
        default_fulfillment_method,
        collection_enabled,
        delivery_enabled,
        default_collection_days,
        delivery_fee,
        deposit_enabled,
        default_deposit_percentage,
        updated_at
      `,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "OPERATIONS SETTINGS LOAD FAILED:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
    );

    return DEFAULT_SETTINGS;
  }

  if (!data) {
    return DEFAULT_SETTINGS;
  }

  return normalizeSettings(data);
}

/* ==============================================================
   NORMALIZE
============================================================== */

function normalizeSettings(
  data: Record<string, unknown>,
): OperationsSettings {
  const fulfillment =
    data.default_fulfillment_method ===
    "delivery"
      ? "delivery"
      : "pickup";

  return {
    id:
      typeof data.id === "string"
        ? data.id
        : "",

    default_fulfillment_method:
      fulfillment,

    collection_enabled:
      data.collection_enabled !== false,

    delivery_enabled:
      data.delivery_enabled !== false,

    default_collection_days:
      toNumber(
        data.default_collection_days,
        2,
      ),

    delivery_fee:
      toNumber(
        data.delivery_fee,
        0,
      ),

    deposit_enabled:
      data.deposit_enabled !== false,

    default_deposit_percentage:
      toNumber(
        data.default_deposit_percentage,
        50,
      ),

    updated_at:
      typeof data.updated_at === "string"
        ? data.updated_at
        : null,
  };
}

/* ==============================================================
   SERVER ACTION
============================================================== */

async function updateOperationsSettings(
  formData: FormData,
) {
  "use server";

  await requireOwnerOrAdmin();

  const fulfillmentRaw = String(
    formData.get(
      "default_fulfillment_method",
    ) ?? "pickup",
  );

  const defaultFulfillmentMethod =
    fulfillmentRaw === "delivery"
      ? "delivery"
      : "pickup";

  const collectionEnabled =
    formData.get(
      "collection_enabled",
    ) === "on";

  const deliveryEnabled =
    formData.get(
      "delivery_enabled",
    ) === "on";

  const depositEnabled =
    formData.get(
      "deposit_enabled",
    ) === "on";

  const collectionDays = parseNumber(
    formData.get(
      "default_collection_days",
    ),
    2,
  );

  const deliveryFee = parseNumber(
    formData.get(
      "delivery_fee",
    ),
    0,
  );

  const depositPercentage =
    parseNumber(
      formData.get(
        "default_deposit_percentage",
      ),
      50,
    );

  if (
    collectionDays < 0 ||
    collectionDays > 30
  ) {
    throw new Error(
      "Collection period must be between 0 and 30 days.",
    );
  }

  if (deliveryFee < 0) {
    throw new Error(
      "Delivery fee cannot be negative.",
    );
  }

  if (
    depositPercentage < 0 ||
    depositPercentage > 100
  ) {
    throw new Error(
      "Deposit percentage must be between 0 and 100.",
    );
  }

  const supabase = await createClient();

  const payload = {
    default_fulfillment_method:
      defaultFulfillmentMethod,

    collection_enabled:
      collectionEnabled,

    delivery_enabled:
      deliveryEnabled,

    default_collection_days:
      collectionDays,

    delivery_fee:
      deliveryFee,

    deposit_enabled:
      depositEnabled,

    default_deposit_percentage:
      depositPercentage,

    updated_at:
      new Date().toISOString(),
  };

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from("operations_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error(
      "OPERATIONS SETTINGS LOOKUP FAILED:",
      {
        message: lookupError.message,
        details: lookupError.details,
        hint: lookupError.hint,
        code: lookupError.code,
      },
    );

    throw new Error(
      "Operations settings could not be accessed. Make sure the operations_settings table exists in Supabase.",
    );
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("operations_settings")
      .update(payload)
      .eq(
        "id",
        existing.id,
      );

    if (error) {
      console.error(
        "OPERATIONS SETTINGS UPDATE FAILED:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      );

      throw new Error(
        "Unable to update operations settings.",
      );
    }

    return;
  }

  const { error } = await supabase
    .from("operations_settings")
    .insert(payload);

  if (error) {
    console.error(
      "OPERATIONS SETTINGS CREATE FAILED:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
    );

    throw new Error(
      "Unable to create operations settings.",
    );
  }
}

/* ==============================================================
   SECTION HEADER
============================================================== */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-800 text-white">
          {icon}
        </div>

        <div className="min-w-0">

          <h2 className="text-sm font-semibold text-neutral-950">
            {title}
          </h2>

          <p className="mt-0.5 text-[11px] text-neutral-400">
            {description}
          </p>

        </div>
      </div>
    </div>
  );
}

/* ==============================================================
   SELECT FIELD
============================================================== */

function SelectField({
  label,
  name,
  defaultValue,
  options,
  icon,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: {
    value: string;
    label: string;
  }[];
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">

      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {icon}
        {label}
      </span>

      <div className="relative mt-2">

        <select
          name={name}
          defaultValue={defaultValue}
          className="h-11 w-full appearance-none rounded-xl border border-black/[0.07] bg-neutral-50 px-3 pr-10 text-sm text-neutral-950 outline-none transition focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-black/[0.03]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

      </div>
    </label>
  );
}

/* ==============================================================
   NUMBER FIELD
============================================================== */

function NumberField({
  label,
  name,
  defaultValue,
  min,
  max,
  step = "1",
  prefix,
  suffix,
  icon,
}: {
  label: string;
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: string;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">

      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {icon}
        {label}
      </span>

      <div className="relative mt-2">

        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
            {prefix}
          </span>
        ) : null}

        <input
          name={name}
          type="number"
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
          className={`h-11 w-full rounded-xl border border-black/[0.07] bg-neutral-50 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-black/[0.03] ${
            prefix
              ? "pl-8"
              : "pl-3"
          } ${
            suffix
              ? "pr-12"
              : "pr-3"
          }`}
        />

        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
            {suffix}
          </span>
        ) : null}

      </div>
    </label>
  );
}

/* ==============================================================
   TOGGLE ROW
============================================================== */

function ToggleRow({
  name,
  label,
  description,
  defaultChecked,
  icon,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  icon: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 px-5 py-5 sm:px-6">

      <div className="flex min-w-0 items-center gap-3">

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-xs font-semibold text-neutral-950">
            {label}
          </p>

          <p className="mt-0.5 max-w-xl text-[11px] leading-5 text-neutral-400">
            {description}
          </p>

        </div>
      </div>

      <div className="relative shrink-0">

        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />

        <div className="h-6 w-11 rounded-full bg-neutral-200 transition peer-checked:bg-blue-800 peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-300" />

        <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm transition peer-checked:translate-x-5">

          <Check className="h-2.5 w-2.5 text-neutral-950 opacity-0 transition peer-checked:opacity-100" />

        </div>

      </div>
    </label>
  );
}

/* ==============================================================
   NUMBER HELPERS
============================================================== */

function parseNumber(
  value: FormDataEntryValue | null,
  fallback: number,
) {
  const parsed = Number(
    String(value ?? ""),
  );

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function toNumber(
  value: unknown,
  fallback: number,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

/* ==============================================================
   FORMATTER
============================================================== */

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}