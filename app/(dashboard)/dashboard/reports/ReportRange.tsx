"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle } from "lucide-react";
export default function ReportRange({ value }: { value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
    <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
    <span className="sr-only">Report period</span>
    <select aria-label="Report period" value={value} onChange={(e) => startTransition(() => router.push(`/dashboard/reports?range=${e.target.value}`, { scroll: false }))} className="min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold text-slate-800 outline-none">
      <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option>
    </select>{pending && <LoaderCircle className="h-4 w-4 animate-spin text-blue-700" />}
  </label>;
}
