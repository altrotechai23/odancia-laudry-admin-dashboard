import Image from "next/image";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 text-white">
      {/* Background Decorative Glows */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.035] blur-3xl" />
        <div className="absolute -bottom-48 -left-24 h-[500px] w-[500px] rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 py-12">
        <div className="mb-8 text-center">
          {/* Logo Container */}
          <div className="relative mx-auto mb-5 flex items-center justify-center rounded-2xl bg-neutral-900 p-3 shadow-[0_15px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="Odancia Laundry Logo"
              width={164}
              height={164}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          {/* Subtitle / Brand Header */}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
            Odancia Laundry
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-100">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-neutral-400">
            Sign in to manage today&apos;s laundry operations.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-[24px] border border-white/10 bg-neutral-900/40 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8">
          <LoginForm />
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-xs tracking-wide text-neutral-500">
          Secure business access &bull; Odancia Laundry OS
        </p>
      </div>
    </main>
  );
}
