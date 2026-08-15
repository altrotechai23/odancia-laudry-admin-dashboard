"use client";

import {
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

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
    success,
    setSuccess,
  ] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    if (password.length < 8) {
      setError(
        "Your password must contain at least 8 characters.",
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match.",
      );

      return;
    }

    setLoading(true);

    try {
      const supabase =
        createClient();

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser(
          {
            password,
          },
        );

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      window.setTimeout(
        () => {
          window.location.assign(
            "/login?reset=success",
          );
        },
        1400,
      );
    } catch (error) {
      console.error(
        "Password update error:",
        error,
      );

      setError(
        "We couldn't update your password. Your reset link may have expired. Please request a new one.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="py-4 text-center">

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
          Password updated
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Your password has been changed successfully. Taking you back to sign in...
        </p>

      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      {/* Password */}

      <div>

        <label
          htmlFor="new-password"
          className="mb-2 block text-sm font-medium text-white/75"
        >
          New password
        </label>

        <div className="relative">

          <input
            id="new-password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            disabled={loading}
            className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 pr-14 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (value) =>
                  !value,
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-white/30 transition hover:text-white/70"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>

        </div>

        <p className="mt-2 text-[11px] text-white/25">
          Use at least 8 characters.
        </p>

      </div>


      {/* Confirm password */}

      <div>

        <label
          htmlFor="confirm-password"
          className="mb-2 block text-sm font-medium text-white/75"
        >
          Confirm password
        </label>

        <div className="relative">

          <input
            id="confirm-password"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            autoComplete="new-password"
            placeholder="Enter it again"
            required
            disabled={loading}
            className="h-13 w-full rounded-2xl border border-white/10 bg-black/20 px-4 pr-14 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (value) =>
                  !value,
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-white/30 transition hover:text-white/70"
            aria-label={
              showConfirmPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showConfirmPassword
              ? "Hide"
              : "Show"}
          </button>

        </div>

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
          !password ||
          !confirmPassword
        }
        className="h-13 w-full rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Updating password..."
          : "Update password"}
      </button>

    </form>
  );
}