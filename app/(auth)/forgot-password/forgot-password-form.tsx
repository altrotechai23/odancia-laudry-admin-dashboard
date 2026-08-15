"use client";

import { useState } from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    sent,
    setSent,
  ] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
      );

      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase =
        createClient();

      const origin =
        window.location.origin;

      const {
        error: resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo:
              `${origin}/auth/callback?next=/reset-password`,
          },
        );

      if (resetError) {
        throw resetError;
      }

      setSent(true);
    } catch (error) {
      console.error(
        "Password reset error:",
        error,
      );

      setError(
        "We couldn't send the reset email. Please check the address and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          Check your email
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/45">
          If an account exists for{" "}
          <span className="font-medium text-white/70">
            {email.trim()}
          </span>
          , you&apos;ll receive a secure password reset link.
        </p>

        <button
          type="button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
          className="mt-6 text-xs font-medium text-white/50 transition hover:text-white"
        >
          Use another email
        </button>

      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      <div>

        <label
          htmlFor="reset-email"
          className="mb-2 block text-sm font-medium text-white/75"
        >
          Email address
        </label>

        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value,
            )
          }
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          disabled={loading}
          className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
        />

      </div>


      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm leading-5 text-red-200"
        >
          {error}
        </div>
      )}


      <button
        type="submit"
        disabled={
          loading ||
          !email.trim()
        }
        className="h-13 w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Sending reset link..."
          : "Send reset link"}
      </button>

    </form>
  );
}