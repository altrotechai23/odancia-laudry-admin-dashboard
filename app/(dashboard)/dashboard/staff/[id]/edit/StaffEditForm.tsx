"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  Shield,
  UserRound,
} from "lucide-react";

import {
  updateStaff,
} from "./actions";

import {
  initialUpdateStaffState,
} from "./types";

import type {
  StaffProfile,
  UpdateStaffRole,
} from "./types";

/* ============================================================
   TYPES
============================================================ */

type StaffEditFormProps = {
  profile: StaffProfile;
  currentRole: UpdateStaffRole;
};

/* ============================================================
   COMPONENT
============================================================ */

export default function StaffEditForm({
  profile,
  currentRole,
}: StaffEditFormProps) {
  /*
   * Bind the staff ID to the server action.

   *Important:*
   *
   * The action itself remains:
   *
   * updateStaff(staffId, previousState, formData)
   *
   * We bind the ID here on the client instead of creating
   * a server-action factory.
   */

  const boundUpdateStaff =
    updateStaff.bind(
      null,
      profile.id,
    );

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    boundUpdateStaff,
    initialUpdateStaffState,
  );

  const [
    fullName,
    setFullName,
  ] = useState(
    profile.full_name,
  );

  const [
    phone,
    setPhone,
  ] = useState(
    profile.phone ?? "",
  );

  const [
    role,
    setRole,
  ] = useState<UpdateStaffRole>(
    profile.role,
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    profile.is_active,
  );

  const canAssignOwner =
    currentRole === "owner";

  /*
   * Keep the owner option visible if the current
   * profile is already an owner.
   *
   * This allows the owner to edit/save their own
   * profile without the select losing its value.
   */
  const showOwnerOption =
    canAssignOwner ||
    profile.role === "owner";

  /*
   * If the server action succeeds, we don't need
   * to manually redirect here. The server revalidates
   * the relevant pages and the user can navigate back.
   */

  useEffect(() => {
    if (
      state.success &&
      state.message
    ) {
      /*
       * Optional lightweight feedback.
       *
       * We intentionally do not redirect automatically
       * so the user can see the successful update.
       */
    }
  }, [
    state.success,
    state.message,
  ]);

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="border-b border-black/[0.06] px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white">
            <UserRound className="h-4 w-4" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-neutral-950">
              Account details
            </h2>

            <p className="mt-0.5 text-[11px] text-neutral-400">
              Update this team member&apos;s
              account information.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          BODY
      ====================================================== */}

      <div className="space-y-6 p-5 sm:p-6">
        {/* ====================================================
            MESSAGE
        ==================================================== */}

        {state.message && (
          <div
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${
              state.success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {state.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <p className="text-xs leading-5">
              {state.message}
            </p>
          </div>
        )}

        {/* ====================================================
            EMAIL
        ==================================================== */}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-semibold text-neutral-800"
          >
            Email address
          </label>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-xl border border-black/[0.08] bg-neutral-50 pl-10 pr-3 text-sm text-neutral-500 outline-none"
            />
          </div>

          <p className="mt-2 text-[11px] text-neutral-400">
            Authentication email is managed by
            Supabase Authentication.
          </p>
        </div>

        {/* ====================================================
            NAME
        ==================================================== */}

        <div>
          <label
            htmlFor="full_name"
            className="mb-2 block text-xs font-semibold text-neutral-800"
          >
            Full name
          </label>

          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={fullName}
              onChange={(event) =>
                setFullName(
                  event.target.value,
                )
              }
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/5 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />
          </div>
        </div>

        {/* ====================================================
            PHONE
        ==================================================== */}

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-xs font-semibold text-neutral-800"
          >
            Phone number
            <span className="ml-1 font-normal text-neutral-400">
              Optional
            </span>
          </label>

          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value,
                )
              }
              placeholder="+27 74 000 0000"
              disabled={isPending}
              className="h-11 w-full rounded-xl border border-black/[0.08] bg-white pl-10 pr-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-300 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/5 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />
          </div>
        </div>

        {/* ====================================================
            ROLE
        ==================================================== */}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="role"
              className="text-xs font-semibold text-neutral-800"
            >
              Account role
            </label>

            <Shield className="h-3.5 w-3.5 text-neutral-400" />
          </div>

          <select
            id="role"
            name="role"
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value as UpdateStaffRole,
              )
            }
            disabled={isPending}
            className="h-11 w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-neutral-950 outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/5 disabled:cursor-not-allowed disabled:bg-neutral-50"
          >
            <option value="staff">
              Staff
            </option>

            <option value="admin">
              Administrator
            </option>

            {showOwnerOption && (
              <option
                value="owner"
                disabled={!canAssignOwner}
              >
                Owner
              </option>
            )}
          </select>

          <p className="mt-2 text-[11px] leading-5 text-neutral-400">
            Staff members have operational
            access. Administrators have management
            access.
            {canAssignOwner &&
              " Owners have full administrative access."}
          </p>

          {!canAssignOwner && (
            <p className="mt-1 text-[11px] leading-5 text-neutral-400">
              Only the current owner can assign
              the owner role.
            </p>
          )}
        </div>

        {/* ====================================================
            STATUS
        ==================================================== */}

        <div className="border-t border-black/[0.06] pt-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <h3 className="text-xs font-semibold text-neutral-900">
                Account status
              </h3>

              <p className="mt-1 max-w-lg text-[11px] leading-5 text-neutral-400">
                Inactive accounts should not be
                able to access the administration
                system.
              </p>
            </div>

            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(
                    event.target.checked,
                  )
                }
                disabled={
                  isPending ||
                  profile.id ===
                    undefined
                }
                className="peer sr-only"
              />

              <span className="h-6 w-11 rounded-full bg-neutral-200 transition peer-checked:bg-neutral-950 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-950/10 peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />

              <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
            />

            <span className="text-[11px] font-medium text-neutral-500">
              {isActive
                ? "Account is active"
                : "Account is inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex flex-col gap-3 border-t border-black/[0.06] bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[11px] leading-5 text-neutral-400">
          Changes are saved immediately to the
          staff profile.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}

          {isPending
            ? "Saving changes..."
            : "Save changes"}
        </button>
      </div>
    </form>
  );
}