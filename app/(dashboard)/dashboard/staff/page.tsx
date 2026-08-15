import Link from "next/link";

import {
  Activity,
  CheckCircle2,
  Phone,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";

import {
  getStaff,
  type StaffMember,
  type StaffRole,
} from "@/lib/staff/get-staff";

type StaffPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function StaffPage({
  searchParams,
}: StaffPageProps) {
  await requireOwnerOrAdmin();

  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const { staff, summary } = await getStaff({
    search,
  });

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <header>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Administration</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Staff</span>
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Staff
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Manage the people who have access to
                the Odancia Laundry administration
                system.
              </p>
            </div>

            <div className="flex shrink-0">
              <Link
                href="/dashboard/staff/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                <UserRound className="h-3.5 w-3.5" />
                Add staff
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Users className="h-4 w-4" />}
            label="Total people"
            value={summary.total}
            description="All accounts"
          />

          <SummaryCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Active"
            value={summary.active}
            description="Currently active"
          />

          <SummaryCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Administrators"
            value={summary.owners + summary.admins}
            description="Owner + admin"
          />

          <SummaryCard
            icon={<UserCog className="h-4 w-4" />}
            label="Staff"
            value={summary.staff}
            description="Staff accounts"
          />
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <RoleCard
            role="owner"
            label="Owners"
            value={summary.owners}
            description="Full system access"
          />

          <RoleCard
            role="admin"
            label="Administrators"
            value={summary.admins}
            description="Management access"
          />

          <RoleCard
            role="staff"
            label="Staff"
            value={summary.staff}
            description="Operational access"
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 border-b border-black/[0.06] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-950">
                  Team members
                </h2>

                <p className="mt-0.5 text-[11px] text-neutral-400">
                  People with access to the system
                </p>
              </div>

              <form
                method="GET"
                className="w-full sm:w-[280px]"
              >
                <div className="relative">
                  <Activity className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />

                  <input
                    type="search"
                    name="q"
                    defaultValue={search}
                    placeholder="Search staff..."
                    className="h-10 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-9 pr-3 text-xs text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
                  />
                </div>
              </form>
            </div>
          </div>

          {staff.length === 0 ? (
            <EmptyStaffState search={search} />
          ) : (
            <div>
              <div className="hidden grid-cols-[minmax(220px,1fr)_150px_130px_180px] gap-4 border-b border-black/[0.05] bg-neutral-50/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-neutral-400 sm:grid sm:px-6">
                <span>Staff member</span>
                <span>Role</span>
                <span>Status</span>
                <span>Contact</span>
              </div>

              <div className="divide-y divide-black/[0.05]">
                {staff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-col gap-1 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {staff.length}{" "}
            {staff.length === 1 ? "person" : "people"}{" "}
            shown
            {search ? ` for "${search}"` : ""}
          </p>

          <p>
            Staff management is restricted to owners
            and administrators.
          </p>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-950 text-white">
          {icon}
        </div>

        <span className="text-2xl font-semibold tracking-tight text-neutral-950">
          {value}
        </span>
      </div>

      <p className="mt-4 text-xs font-semibold text-neutral-950">
        {label}
      </p>

      <p className="mt-1 text-[11px] text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function RoleCard({
  role,
  label,
  value,
  description,
}: {
  role: StaffRole;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] bg-white px-4 py-3.5 shadow-[0_6px_30px_rgba(0,0,0,0.025)]">
      <div className="flex items-center gap-3">
        <RoleIcon role={role} />

        <div>
          <p className="text-xs font-semibold text-neutral-950">
            {label}
          </p>

          <p className="mt-0.5 text-[11px] text-neutral-400">
            {description}
          </p>
        </div>
      </div>

      <span className="text-lg font-semibold text-neutral-950">
        {value}
      </span>
    </div>
  );
}

function StaffRow({
  member,
}: {
  member: StaffMember;
}) {
  return (
    <div className="px-5 py-4 transition hover:bg-neutral-50/60 sm:px-6">
      {/* Desktop */}
      <div className="hidden grid-cols-[minmax(220px,1fr)_150px_130px_180px] items-center gap-4 sm:grid">

        <Link
          href={`/dashboard/staff/${member.id}/edit`}
          className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20"
        >
          <StaffIdentity member={member} />
        </Link>

        <RoleBadge role={member.role} />

        <StatusBadge
          active={member.is_active}
        />

        <ContactInfo member={member} />
      </div>

      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-start justify-between gap-4">
          <Link
            href={`/dashboard/staff/${member.id}/edit`}
            className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20"
          >
            <StaffIdentity member={member} />
          </Link>

          <StatusBadge
            active={member.is_active}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />

          <ContactInfo member={member} />
        </div>
      </div>
    </div>
  );
}

function StaffIdentity({
  member,
}: {
  member: StaffMember;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-500">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-950">
          {member.full_name}
        </p>

        <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-400">
          {member.id}
        </p>
      </div>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: StaffRole;
}) {
  const config = {
    owner: {
      label: "Owner",
      className:
        "bg-purple-50 text-purple-700 ring-purple-600/10",
    },
    admin: {
      label: "Admin",
      className:
        "bg-blue-50 text-blue-700 ring-blue-600/10",
    },
    staff: {
      label: "Staff",
      className:
        "bg-neutral-100 text-neutral-600 ring-neutral-500/10",
    },
  } as const;

  const item = config[role];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  if (active) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 ring-1 ring-inset ring-red-600/10">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Inactive
    </span>
  );
}

function ContactInfo({
  member,
}: {
  member: StaffMember;
}) {
  return (
    <div className="flex flex-col gap-1">
      {member.phone ? (
        <a
          href={`tel:${member.phone}`}
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 transition hover:text-neutral-950"
        >
          <Phone className="h-3 w-3 shrink-0" />

          <span className="truncate">
            {member.phone}
          </span>
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
          <Phone className="h-3 w-3" />
          No phone
        </span>
      )}
    </div>
  );
}

function RoleIcon({
  role,
}: {
  role: StaffRole;
}) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
      {role === "owner" && (
        <ShieldCheck className="h-4 w-4" />
      )}

      {role === "admin" && (
        <UserCog className="h-4 w-4" />
      )}

      {role === "staff" && (
        <UserRound className="h-4 w-4" />
      )}
    </div>
  );
}

function EmptyStaffState({
  search,
}: {
  search: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        {search ? (
          <XCircle className="h-6 w-6" />
        ) : (
          <Users className="h-6 w-6" />
        )}
      </div>

      <h3 className="mt-5 text-base font-semibold text-neutral-950">
        {search
          ? "No staff found"
          : "No staff members yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-400">
        {search
          ? `No staff members matched "${search}". Try another search.`
          : "Add your first staff member to begin managing your team."}
      </p>

      {search ? (
        <Link
          href="/dashboard/staff"
          className="mt-5 inline-flex h-10 items-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Clear search
        </Link>
      ) : (
        <Link
          href="/dashboard/staff/new"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
        >
          <UserRound className="h-3.5 w-3.5" />
          Add staff
        </Link>
      )}
    </div>
  );
}