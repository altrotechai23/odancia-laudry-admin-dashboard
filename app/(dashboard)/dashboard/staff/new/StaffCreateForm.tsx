"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Loader2,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";

import { createClientAction } from "./actions";

const initialState = {
  success: false,
  message: "",
};

type ClientCreateFormProps = {
  currentRole: "staff" | "owner" | "admin";
};

export default function ClientCreateForm({
  currentRole,
}: ClientCreateFormProps) {
  const [state, formAction, pending] = useActionState(
    createClientAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
        {state.message && !state.success ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
          >
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Full name"
            name="full_name"
            placeholder="e.g. John Smith"
            icon={<UserRound className="h-3.5 w-3.5" />}
            required
            autoComplete="name"
          />

          <Field
            label="Phone number"
            name="phone"
            type="tel"
            placeholder="e.g. +27 74 123 4567"
            icon={<Phone className="h-3.5 w-3.5" />}
            required
            autoComplete="tel"
          />

          <Field
            label="Email address"
            name="email"
            type="email"
            placeholder="e.g. john@example.com"
            icon={<Mail className="h-3.5 w-3.5" />}
            autoComplete="email"
          />
        </div>

        <div className="rounded-2xl border border-black/[0.05] bg-neutral-50/70 px-4 py-3">
          <p className="text-[11px] leading-5 text-neutral-400">
            Only the client&apos;s basic contact information is
            required. Additional customer information can be
            added later.
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-black/[0.06] bg-neutral-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
        <Link
          href="/dashboard/clients"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white px-4 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Create client
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  icon,
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  icon: React.ReactNode;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-neutral-950"
      >
        {label}

        {required ? (
          <span className="ml-1 text-neutral-400">*</span>
        ) : (
          <span className="ml-1 text-[10px] font-normal text-neutral-400">
            Optional
          </span>
        )}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-neutral-400">
          {icon}
        </div>

        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-black/[0.07] bg-neutral-50 pl-9 pr-3 text-xs text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-300 focus:bg-white"
        />
      </div>
    </div>
  );
}