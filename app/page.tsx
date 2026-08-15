import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white">
            O
          </div>

          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
            Odancia Laundry
          </p>

          <h1 className="text-4xl font-semibold tracking-tight">
            Laundry OS
          </h1>

          <p className="mt-4 leading-7 text-neutral-500">
            A modern operating system for managing laundry
            services, clients, payments and daily operations.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-6 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Staff Login
          </Link>

          <div className="inline-flex h-12 items-center justify-center rounded-xl border border-black/10 bg-neutral-50 px-6 text-sm text-neutral-500">
            System setup
          </div>
        </div>
      </div>
    </main>
  );
}