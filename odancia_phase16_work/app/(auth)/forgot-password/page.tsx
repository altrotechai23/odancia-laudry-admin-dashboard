import Link from "next/link";

import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-blue-800 text-white">

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-3xl" />

        <div className="absolute bottom-[-200px] left-[-100px] h-[500px] w-[500px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-12">

        <div className="w-full max-w-md">

          <div className="mb-8 text-center">

            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-bold text-black shadow-[0_15px_60px_rgba(255,255,255,0.12)]">
              O
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              Odancia Laundry
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Reset password
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Enter your account email and we&apos;ll send you a secure password reset link.
            </p>

          </div>


          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-7 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8">

            <ForgotPasswordForm />

          </div>


          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-xs font-medium text-white/35 transition hover:text-white/70"
            >
              ← Back to sign in
            </Link>
          </div>


          <p className="mt-6 text-center text-xs text-white/25">
            Secure business access · Odancia Laundry OS
          </p>

        </div>

      </div>

    </main>
  );
}