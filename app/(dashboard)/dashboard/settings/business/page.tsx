import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import { createClient } from "@/lib/supabase/server";

type BusinessSettings = {
  id: string;
  business_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  updated_at: string | null;
};

const DEFAULT_SETTINGS: BusinessSettings = {
  id: "",
  business_name: "Odancia Laundry",
  phone: "",
  email: "",
  address: "",
  city: "Cape Town",
  province: "Western Cape",
  postal_code: "",
  updated_at: null,
};

export default async function BusinessSettingsPage() {
  const currentUser = await requireOwnerOrAdmin();

  const settings = await getBusinessSettings();

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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Settings</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Business</span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Business profile
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Manage the business information used throughout
                the Odancia Laundry dashboard.
              </p>
            </div>
          </div>
        </header>

        {/* ======================================================
            FORM
        ====================================================== */}

        <form
          action={updateBusinessSettings}
          className="mt-7 space-y-5"
        >
          {/* ====================================================
              BUSINESS INFORMATION
          ==================================================== */}

          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
                  <Store className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-neutral-950">
                    Business information
                  </h2>

                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    Your primary business identity.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Business name"
                name="business_name"
                defaultValue={settings.business_name}
                placeholder="Odancia Laundry"
                icon={
                  <Building2 className="h-3.5 w-3.5" />
                }
                required
              />

              <Field
                label="Phone number"
                name="phone"
                type="tel"
                defaultValue={settings.phone}
                placeholder="+27 74 943 3677"
                icon={
                  <Phone className="h-3.5 w-3.5" />
                }
              />

              <Field
                label="Email address"
                name="email"
                type="email"
                defaultValue={settings.email}
                placeholder="odancialaundry8@gmail.com"
                icon={
                  <Mail className="h-3.5 w-3.5" />
                }
              />

              <Field
                label="Province"
                name="province"
                defaultValue={settings.province}
                placeholder="Western Cape"
                icon={
                  <MapPin className="h-3.5 w-3.5" />
                }
              />
            </div>
          </section>

          {/* ====================================================
              ADDRESS
          ==================================================== */}

          <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
                  <MapPin className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-neutral-950">
                    Business address
                  </h2>

                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    The physical location associated with the
                    business.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  name="address"
                  defaultValue={settings.address}
                  placeholder="105 Long Street"
                  icon={
                    <MapPin className="h-3.5 w-3.5" />
                  }
                />
              </div>

              <Field
                label="City"
                name="city"
                defaultValue={settings.city}
                placeholder="Cape Town"
              />

              <Field
                label="Postal code"
                name="postal_code"
                defaultValue={settings.postal_code}
                placeholder="8001"
              />
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
                : "Business information has not been updated yet."}
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
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-[0.99]"
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
   LOAD BUSINESS SETTINGS
============================================================== */

async function getBusinessSettings(): Promise<BusinessSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_settings")
    .select(
      `
        id,
        business_name,
        phone,
        email,
        address,
        city,
        province,
        postal_code,
        updated_at
      `,
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    /*
     * We intentionally return defaults here instead of
     * crashing the entire dashboard.
     *
     * If the table does not exist yet, the SQL migration
     * below must be run in Supabase.
     */
    console.error(
      "BUSINESS SETTINGS LOAD FAILED:",
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

  return {
    id: data.id,
    business_name:
      data.business_name ?? DEFAULT_SETTINGS.business_name,
    phone: data.phone ?? "",
    email: data.email ?? "",
    address: data.address ?? "",
    city: data.city ?? "",
    province: data.province ?? "",
    postal_code: data.postal_code ?? "",
    updated_at: data.updated_at ?? null,
  };
}

/* ==============================================================
   SERVER ACTION
============================================================== */

async function updateBusinessSettings(
  formData: FormData,
) {
  "use server";

  await requireOwnerOrAdmin();

  const businessName = String(
    formData.get("business_name") ?? "",
  ).trim();

  const phone = String(
    formData.get("phone") ?? "",
  ).trim();

  const email = String(
    formData.get("email") ?? "",
  ).trim();

  const address = String(
    formData.get("address") ?? "",
  ).trim();

  const city = String(
    formData.get("city") ?? "",
  ).trim();

  const province = String(
    formData.get("province") ?? "",
  ).trim();

  const postalCode = String(
    formData.get("postal_code") ?? "",
  ).trim();

  if (!businessName) {
    throw new Error(
      "Business name is required.",
    );
  }

  const supabase = await createClient();

  const payload = {
    business_name: businessName,
    phone: phone || null,
    email: email || null,
    address: address || null,
    city: city || null,
    province: province || null,
    postal_code: postalCode || null,
    updated_at: new Date().toISOString(),
  };

  /*
   * Get the existing settings row.
   */

  const { data: existing, error: lookupError } =
    await supabase
      .from("business_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

  if (lookupError) {
    console.error(
      "BUSINESS SETTINGS LOOKUP FAILED:",
      {
        message: lookupError.message,
        details: lookupError.details,
        hint: lookupError.hint,
        code: lookupError.code,
      },
    );

    throw new Error(
      "Business settings could not be accessed. Make sure the business_settings table exists in Supabase.",
    );
  }

  /*
   * Update existing row.
   */

  if (existing?.id) {
    const { error } = await supabase
      .from("business_settings")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      console.error(
        "BUSINESS SETTINGS UPDATE FAILED:",
        {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
      );

      throw new Error(
        "Unable to update business settings.",
      );
    }

    return;
  }

  /*
   * Create the first settings row.
   */

  const { error } = await supabase
    .from("business_settings")
    .insert(payload);

  if (error) {
    console.error(
      "BUSINESS SETTINGS CREATE FAILED:",
      {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
    );

    throw new Error(
      "Unable to create business settings.",
    );
  }
}

/* ==============================================================
   FIELD
============================================================== */

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  icon,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {icon}
        {label}
      </span>

      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="mt-2 h-11 w-full rounded-xl border border-black/[0.07] bg-neutral-50 px-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-300 focus:bg-white focus:ring-2 focus:ring-black/[0.03]"
      />
    </label>
  );
}

/* ==============================================================
   FORMATTER
============================================================== */

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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