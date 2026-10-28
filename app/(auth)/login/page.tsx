import Image from "next/image";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen  items-center justify-center overflow-hidden bg-[#071d3a] px-4 py-10 text-slate-950 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-36 h-[28rem] w-[28rem] rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-red-500/25 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-white/70 to-red-600" />
      </div>

      <div className="relative  z-10 w-full max-w-4xl">
        <div className="mb-2 flex justify-center   px-5  shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <Image src="/odancia-logo.png" alt="Odancia Laundry" width={1254} height={262} priority className="h-auto max-h-28 w-full object-contain" />
        </div>

        <div className="rounded-[28px] border border-white/70 bg-white/60 px-6 shadow-[0_28px_100px_rgba(0,0,0,0.30)] sm:p-8">
          <div className="mb-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-800"><span className="h-2 w-2 rounded-full bg-red-600" />Administrator access</div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to manage laundry services, payments and team attendance.</p>
          </div>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-white/65">Odancia Laundry · Secure management workspace</p>
      </div>
    </main>
  );
}
