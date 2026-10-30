"use client";

import { useState, useTransition, type FormEvent } from "react";
import { testTwilioSms } from "@/actions/settings/test-twilio-sms";

type Result = { success: boolean; message: string; sid?: string | null };

export default function TwilioSmsTest() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      try {
        const response = await testTwilioSms(phone);
        setResult(response);
      } catch {
        setResult({ success: false, message: "The test request failed before a result was returned. Check the application server logs and try again." });
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label htmlFor="twilio-test-phone" className="block text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">Recipient mobile number</label>
      <input id="twilio-test-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 0712345678 or +27712345678" maxLength={32} required className="min-h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-700/10" />
      <button type="submit" disabled={isPending || !phone.trim()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
        {isPending ? "Sending test…" : "Send test SMS"}
      </button>
      {result && (
        <div role="status" aria-live="polite" className={`rounded-xl border p-4 text-sm leading-6 ${result.success ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>
          <p className="font-semibold">{result.success ? "Request accepted" : "Test failed"}</p>
          <p className="mt-1 break-words">{result.message}</p>
          {result.sid && <p className="mt-2 text-xs">Message SID: <code>{result.sid}</code></p>}
        </div>
      )}
    </form>
  );
}
