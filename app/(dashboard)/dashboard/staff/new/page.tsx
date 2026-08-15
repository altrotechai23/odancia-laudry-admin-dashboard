import Link from "next/link";

import {
  ArrowLeft,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";

import StaffCreateForm from "./StaffCreateForm";

export default async function NewStaffPage() {
  const currentUser =
    await requireOwnerOrAdmin();

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

        <header className="mt-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                <span>Administration</span>

                <span className="h-1 w-1 rounded-full bg-neutral-300" />

                <span>Staff</span>
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                Add team member
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                Create a new account and give the
                team member access to the
                administration system.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-7">
          <StaffCreateForm
            currentRole={currentUser.role}
          />
        </div>

        <section className="mt-5 rounded-2xl border border-black/[0.06] bg-neutral-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-900">
                Account security
              </p>

              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                New accounts are created securely
                through Supabase Authentication.
                Passwords are never stored in the
                profiles table.
              </p>
            </div>
          </div>
        </section>

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
                You are creating this account as{" "}
                <span className="font-semibold text-neutral-700">
                  {currentUser.role}
                </span>
                .

                {currentUser.role === "admin" &&
                  " Administrators can create staff and admin accounts, but cannot create owner accounts."}

                {currentUser.role === "owner" &&
                  " Owners can create staff, admin, and owner accounts."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}