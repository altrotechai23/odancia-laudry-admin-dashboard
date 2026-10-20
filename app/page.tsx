import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="inset-0 absolute -z-10">

      </div>
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-10 shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
        <div className="mb-8">
          <div className="relative mx-auto mb-5 flex  items-center bg-white justify-center rounded-2xl">
                      <Image
                        src="/logo.png"
                        alt="Odancia Laundry Logo"
                        width={364}
                        height={164}
                        className="h-full w-full object-contain"
                        priority
                      />
                    </div>

          <h1 className="text-4xl text-blue-400 font-semibold tracking-tight">
            Laundry 
          </h1>

          <p className="mt-4 leading-7 text-blue-950">
            A modern operating system for managing laundry
            services, clients, payments and daily operations.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-800 px-6 text-sm font-medium text-white transition hover:bg-red-00"
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