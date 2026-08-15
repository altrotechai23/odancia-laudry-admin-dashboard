"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  login,
  type LoginState,
} from "./actions";

const initialState: LoginState = {
  error: null,
};

export default function LoginForm() {
  const [state, formAction] =
    useActionState(
      login,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-white/75"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/30"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-white/75"
          >
            Password
          </label>

          <Link
            href="/forgot-password"
            className="text-xs font-medium text-white/45 transition hover:text-white"
          >
            Forgot password?
          </Link>
        </div>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/30"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-5 text-red-200"
        >
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative h-13 w-full overflow-hidden rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="relative z-10">
        {pending
          ? "Signing in..."
          : "Sign in"}
      </span>
    </button>
  );
}