import Image from "next/image";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="odancia-login-screen relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#071d3a] px-3 py-3 text-slate-950 sm:px-6 sm:py-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 -top-36 h-[28rem] w-[28rem] rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-red-500/25 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-white/70 to-red-600" />
      </div>

      <div className="odancia-login-content relative z-10 flex max-h-full w-full max-w-md flex-col justify-center gap-3 sm:gap-4">
        <div className="odancia-login-logo flex shrink-0 justify-center rounded-2xl border border-white/35 bg-white px-4 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:rounded-3xl sm:py-3">
          <Image src="/odancia-logo.png" alt="Odancia Laundry" width={1254} height={462} priority className="h-auto max-h-16 w-full object-contain sm:max-h-[76px]" />
        </div>

        <div className="odancia-login-card rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:p-5">
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-800"><span className="h-2 w-2 rounded-full bg-red-600" />Administrator access</div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Welcome back</h1>
            <p className="odancia-login-description mt-1.5 text-sm leading-5 text-slate-500">Sign in to manage laundry services, payments and team attendance.</p>
          </div>
          <LoginForm />
        </div>

        <p className="odancia-login-footer text-center text-[10px] leading-4 text-white/65">Odancia Laundry · Secure management workspace</p>
      </div>
    </main>
  );
}
