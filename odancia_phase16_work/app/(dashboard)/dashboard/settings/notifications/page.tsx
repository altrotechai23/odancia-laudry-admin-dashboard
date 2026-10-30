import Link from "next/link";
import { ArrowLeft, BellRing, CheckCircle2, MessageSquareText, ShieldAlert } from "lucide-react";

import { requireOwnerOrAdmin } from "@/lib/auth/get-current-user";
import TwilioSmsTest from "./twilio-sms-test";

export default async function NotificationsSettingsPage() {
  await requireOwnerOrAdmin();

  const accountConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_PHONE_NUMBER?.trim(),
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1000px]">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 transition hover:text-neutral-950">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
        </Link>

        <header className="mt-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-800 text-white">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">Settings / Notifications</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Check the server-side Twilio configuration and send a controlled test SMS before relying on automatic customer messages.</p>
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)] sm:p-6">
          <div className="flex items-start gap-3">
            {accountConfigured ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">Twilio server configuration</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600">{accountConfigured ? "The Account SID, Auth Token, and sender number are present on this server. This does not confirm the sender is SMS-enabled or that a carrier will deliver messages." : "One or more required Twilio environment variables are missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in the deployment environment, then restart/redeploy the app."}</p>
              <p className="mt-2 text-xs text-neutral-400">Credentials are checked server-side only and are never displayed on this page.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_40px_rgba(0,0,0,0.03)] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-800"><MessageSquareText className="h-5 w-5" /></div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">Send a test SMS</h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500">Use your own phone first. South African local numbers such as 0712345678 are supported; international numbers must include their country code.</p>
            </div>
          </div>
          <TwilioSmsTest />
        </section>

        <section className="mt-4 rounded-3xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-blue-950">If the test fails</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-900/80">
            <li>Check the exact Twilio error code returned by the test.</li>
            <li>Confirm the sender number is SMS-capable and belongs to the same Twilio account as the SID and token.</li>
            <li>If the account is trial/restricted, verify the recipient number in Twilio Console.</li>
            <li>For South African destinations, check the Twilio message log for delivery status and any destination, regulatory, or carrier restriction. A paid plan alone does not guarantee delivery.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
