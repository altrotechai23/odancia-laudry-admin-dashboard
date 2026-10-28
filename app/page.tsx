import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, CreditCard, UsersRound } from "lucide-react";

export default function Home() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-200/45 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-[26rem] w-[26rem] rounded-full bg-red-100/70 blur-3xl" />
      </div>

      <section className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_100px_rgba(7,55,101,0.12)]">
        <div className="h-1.5 bg-gradient-to-r from-blue-700 via-sky-400 to-red-600" />
        <div className="px-6 py-9 sm:px-10 sm:py-12">
          <div className="mx-auto flex max-w-md items-center justify-center rounded-2xl bg-white px-2 py-3">
            <Image
              src="/odancia-logo.png"
              alt="Odancia Laundry"
              width={1254}
              height={462}
              priority
              className="h-auto max-h-36 w-full object-contain"
            />
          </div>

          <div className="mx-auto mt-8 max-w-xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-900">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              Laundry operations workspace
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Run your laundry business with confidence.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Manage customers, laundry services, payments and team attendance from one place.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            <Feature icon={<UsersRound className="h-4 w-4" />} label="Customer records" />
            <Feature icon={<CreditCard className="h-4 w-4" />} label="Payments" />
            <Feature icon={<Clock3 className="h-4 w-4" />} label="Team attendance" />
          </div>

          <div className="mx-auto mt-9 flex max-w-sm flex-col gap-3">
            <Link
              href="/login"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-800 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
            >
              Administrator sign in
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <p className="text-center text-xs leading-5 text-slate-500">
              Staff do not sign in. Administrators manage shifts, and a staff member’s four-digit code is only needed to authorize service changes or payments.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-center text-[11px] text-slate-500">
          <span className="font-semibold text-blue-900">Odancia Laundry</span>
          <span className="mx-2 text-red-500">•</span>
          Secure business management
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-xs font-semibold text-slate-700">
      <span className="text-blue-800">{icon}</span>
      {label}
    </div>
  );
}
