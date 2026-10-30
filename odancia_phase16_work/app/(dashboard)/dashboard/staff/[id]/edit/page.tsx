import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import {
  requireOwnerOrAdmin,
} from "@/lib/auth/get-current-user";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import StaffEditForm from "./StaffEditForm";

import type {
  StaffProfile,
} from "./types";

/* ============================================================
   TYPES
============================================================ */

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

/* ============================================================
   PAGE
============================================================ */

export default async function EditStaffPage({
  params,
}: PageProps) {
  /* ----------------------------------------------------------
     REQUIRE OWNER / ADMIN
  ---------------------------------------------------------- */

  const currentUser =
    await requireOwnerOrAdmin();

  const { id } = await params;

  /* ----------------------------------------------------------
     VALIDATE ID
  ---------------------------------------------------------- */

  if (!id) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to staff
          </Link>

          <div className="mt-7 rounded-3xl border border-red-100 bg-red-50 p-6">
            <p className="text-sm font-medium text-red-700">
              Staff member could not be identified.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------------------------------------
     SUPABASE CLIENT
  ---------------------------------------------------------- */

  const supabase =
    await createClient();

  /* ----------------------------------------------------------
     GET PROFILE
  ---------------------------------------------------------- */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        phone,
        address,
        contact_email,
        role,
        avatar_url,
        is_active
      `,
    )
    .eq("id", id)
    .maybeSingle();

  /* ----------------------------------------------------------
     PROFILE NOT FOUND
  ---------------------------------------------------------- */

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "STAFF PROFILE LOAD FAILED:",
      profileError,
    );

    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to staff
          </Link>

          <div className="mt-7 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <UserRound className="h-5 w-5" />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-neutral-950">
              Staff member not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              The staff profile you are trying
              to edit could not be found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------------------------------------
     ADMIN PROTECTION
  ---------------------------------------------------------- */

  if (
    currentUser.role === "admin" &&
    profile.role === "owner"
  ) {
    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to staff
          </Link>

          <div className="mt-7 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-neutral-950">
              Owner profile protected
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Administrators cannot modify an
              owner account.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------------------------------------
     ADMIN SUPABASE CLIENT
  ---------------------------------------------------------- */

  let supabaseAdmin;

  try {
    supabaseAdmin =
      createAdminClient();
  } catch (error) {
    console.error(
      "ADMIN SUPABASE CLIENT FAILED:",
      error,
    );

    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to staff
          </Link>

          <div className="mt-7 rounded-3xl border border-red-100 bg-red-50 p-6">
            <p className="text-sm font-medium text-red-700">
              The server is not configured
              correctly.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------------------------------------
     GET AUTH USER
  ---------------------------------------------------------- */

  const {
    data: authUserData,
    error: authUserError,
  } =
    await supabaseAdmin.auth.admin.getUserById(
      id,
    );

  if (
    authUserError ||
    !authUserData.user
  ) {
    console.error(
      "STAFF AUTH USER LOAD FAILED:",
      authUserError,
    );

    return (
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[900px]">
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />

            Back to staff
          </Link>

          <div className="mt-7 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <UserRound className="h-5 w-5" />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-neutral-950">
              Authentication account not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              The profile exists, but its Supabase
              Authentication account could not be
              loaded.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------------------------------------
     EMAIL
  ---------------------------------------------------------- */

  const email =
    authUserData.user.email ?? "";

  /* ----------------------------------------------------------
     FINAL PROFILE
  ---------------------------------------------------------- */

  const staffProfile: StaffProfile = {
    id: profile.id,
    full_name: profile.full_name,
    phone: profile.phone,
    role: profile.role,
    avatar_url: profile.avatar_url,
    is_active: profile.is_active,
    address: profile.address ?? "",
    contact_email: profile.contact_email ?? "",
    email,
  };

  /* ----------------------------------------------------------
     PAGE
  ---------------------------------------------------------- */

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[900px]">
        {/* ==================================================
            BACK
        ================================================== */}

        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />

          Back to staff
        </Link>

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mt-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-800 text-white shadow-sm">
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>
                  Administration
                </span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>
                  Staff
                </span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Edit staff member
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Update this team member&apos;s
                profile, role, phone number, and
                account status.
              </p>
            </div>
          </div>
        </header>

        {/* ==================================================
            FORM
        ================================================== */}

        <div className="mt-7">
          <StaffEditForm
            profile={staffProfile}
            currentRole={currentUser.role}
          />
        </div>

        {/* ==================================================
            SECURITY NOTE
        ================================================== */}

        <section className="mt-5 rounded-2xl border border-black/[0.06] bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Profile security
              </p>

              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                Profile changes are restricted to
                owners and administrators.
                Passwords are never stored in the
                profiles table.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================
            ACCESS INFO
        ================================================== */}

        <section className="mt-3 rounded-2xl border border-black/[0.06] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <Users className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Your access level
              </p>

              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                You are editing this profile as{" "}
                <span className="font-semibold text-neutral-700">
                  {currentUser.role}
                </span>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}