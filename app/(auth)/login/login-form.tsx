"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Administrator email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="email" name="email" type="email" autoComplete="username" inputMode="email" placeholder="admin@example.com" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">Password</label>
          <Link href="/forgot-password" className="text-xs font-semibold text-blue-700 transition hover:text-red-600">Forgot password?</Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
        </div>
      </div>
      {state.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{state.error}</div>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
      {pending ? "Signing in…" : "Sign in to workspace"}
      {!pending && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
    </button>
  );
}
