import Link from "next/link";
import {
  Bell,
  Building2,
  ChevronRight,
  CircleUserRound,
  LockKeyhole,
  MapPin,
  Settings2,
  ShieldCheck,
  Store,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";

type SettingsSection = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  label: string;
};

export default async function SettingsPage() {
  const currentUser = await requireOwnerOrAdmin();

  const sections: SettingsSection[] = [
    {
      title: "Business profile",
      description:
        "Manage your laundry business name, contact details, and address.",
      href: "/dashboard/settings/business",
      icon: <Building2 className="h-4 w-4" />,
      label: "Business",
    },
    {
      title: "Operations",
      description:
        "Configure how services, collections, deliveries, and customer records are handled.",
      href: "/dashboard/settings/operations",
      icon: <Settings2 className="h-4 w-4" />,
      label: "Operations",
    },
    {
      title: "Notifications",
      description:
        "Control operational alerts and notification preferences.",
      href: "/dashboard/settings/notifications",
      icon: <Bell className="h-4 w-4" />,
      label: "Notifications",
    },
    {
      title: "Account",
      description:
        "View your account information and personal dashboard settings.",
      href: "/dashboard/settings/account",
      icon: <CircleUserRound className="h-4 w-4" />,
      label: "Account",
    },
    {
      title: "Security",
      description:
        "Review access, authentication, and security-related settings.",
      href: "/dashboard/settings/security",
      icon: <LockKeyhole className="h-4 w-4" />,
      label: "Security",
    },
  ];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1100px]">
        {/* HEADER */}

        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>System</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Settings</span>
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Settings
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Manage your business configuration, operations,
                account, and security preferences.
              </p>
            </div>
          </div>
        </header>

        {/* ACCOUNT STRIP */}

        <section className="mt-7 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
                <CircleUserRound className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Signed in as
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
                  {currentUser.full_name ?? "Administrator"}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
              <ShieldCheck className="h-3 w-3" />
              {formatRole(currentUser.role)}
            </div>
          </div>
        </section>

        {/* SETTINGS */}

        <section className="mt-5">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-neutral-950">
              Configuration
            </h2>

            <p className="mt-0.5 text-[11px] text-neutral-400">
              Choose an area to manage your dashboard.
            </p>
          </div>

          <div className="grid gap-3">
            {sections.map((section) => (
              <SettingsCard
                key={section.href}
                section={section}
              />
            ))}
          </div>
        </section>

        {/* BUSINESS QUICK INFO */}

        <section className="mt-5 rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
                <Store className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-neutral-950">
                  Odancia Laundry
                </h2>

                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Business configuration
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-black/[0.05] sm:grid-cols-2">
            <InfoItem
              icon={<Store className="h-3.5 w-3.5" />}
              label="Business"
              value="Odancia Laundry"
            />

            <InfoItem
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Location"
              value="Cape Town, Western Cape"
            />
          </div>
        </section>

        {/* FOOTER */}

        <footer className="mt-5 flex flex-col gap-1 pb-6 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Dashboard configuration is managed securely.
          </p>

          <p>
            Odancia Laundry Admin
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ============================================================
   SETTINGS CARD
============================================================ */

function SettingsCard({
  section,
}: {
  section: SettingsSection;
}) {
  return (
    <Link
      href={section.href}
      className="group flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)] transition duration-200 hover:-translate-y-[1px] hover:border-black/[0.09] hover:bg-neutral-50/70 hover:shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-white transition group-hover:scale-[1.02]">
        {section.icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-950">
            {section.title}
          </h3>

          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
            {section.label}
          </span>
        </div>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-400">
          {section.description}
        </p>
      </div>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-300 transition group-hover:bg-white group-hover:text-neutral-950">
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

/* ============================================================
   INFO ITEM
============================================================ */

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-2 text-neutral-400">
        {icon}

        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xs font-medium text-neutral-950">
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatRole(
  role: string | null | undefined,
) {
  switch (role) {
    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "staff":
      return "Staff";

    default:
      return "User";
  }
}