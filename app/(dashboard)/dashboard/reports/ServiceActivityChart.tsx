"use client";

import { useState } from "react";
import { X, CalendarDays, Package, ArrowUpRight } from "lucide-react";
import Link from "next/link";

type ActivityService = { id: string; service_number: string | null; client_name: string; service_status: string; price: number; created_at: string };
type Day = { key: string; label: string; count: number; services: ActivityService[] };
const money = (n:number) => new Intl.NumberFormat("en-ZA", { style:"currency", currency:"ZAR", maximumFractionDigits:2 }).format(n);
const statusLabel = (s:string) => s === "collected" ? "Collected" : s === "ready_for_collection" ? "Ready for collection" : s.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());

export default function ServiceActivityChart({ days }: { days: Day[] }) {
  const [selected, setSelected] = useState<Day | null>(null);
  const max = Math.max(1, ...days.map(d => d.count));
  return <>
    <div className="mt-7 flex h-44 items-end gap-2 sm:gap-5" aria-label="Interactive bar chart of new services for the last seven days">
      {days.map(day => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
        <span className="text-xs font-semibold text-slate-700">{day.count}</span>
        <button type="button" onClick={() => setSelected(day)} aria-label={`View ${day.count} services for ${day.label}`} className="group flex min-h-0 w-full max-w-12 flex-1 items-end overflow-hidden rounded-t-xl bg-slate-100 outline-none ring-blue-500 transition hover:bg-blue-100 focus-visible:ring-2 active:scale-[0.97]">
          <span className="w-full rounded-t-xl bg-gradient-to-t from-blue-800 to-blue-500 transition-[height,filter] duration-500 group-hover:brightness-110" style={{ height: `${Math.max(day.count ? 12 : 3, day.count / max * 100)}%` }} />
        </button>
        <span className="text-[11px] text-slate-500">{day.label}</span>
      </div>)}
    </div>
    <p className="mt-4 text-[11px] text-slate-400">Tap any bar to explore that day’s service activity.</p>
    {selected && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm animate-in fade-in duration-200 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" className="w-full max-w-xl overflow-hidden rounded-t-[2rem] border border-white/70 bg-white shadow-2xl animate-in slide-in-from-bottom-6 zoom-in-95 duration-300 sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 sm:p-6">
          <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700"><CalendarDays className="h-4 w-4"/> Daily activity</div><h3 id="activity-dialog-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{new Date(`${selected.key}T12:00:00`).toLocaleDateString("en-ZA", { weekday:"long", day:"numeric", month:"long", year:"numeric", timeZone:"Africa/Johannesburg" })}</h3><p className="mt-1 text-sm text-slate-500">{selected.count} {selected.count === 1 ? "service was" : "services were"} created this day</p></div>
          <button type="button" onClick={() => setSelected(null)} aria-label="Close daily activity" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:rotate-90 hover:bg-slate-50"><X className="h-5 w-5"/></button>
        </div>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4 sm:p-6">
          {selected.services.length ? selected.services.map(service => <Link key={service.id} href={`/dashboard/services/${service.id}`} onClick={() => setSelected(null)} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm active:scale-[0.99]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Package className="h-5 w-5"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{service.service_number ?? service.id.slice(0,8)} · {service.client_name}</span><span className="mt-1 block text-xs capitalize text-slate-500">{statusLabel(service.service_status)}</span></span><span className="text-right"><span className="block text-sm font-semibold text-slate-900">{money(service.price)}</span><ArrowUpRight className="ml-auto mt-1 h-4 w-4 text-blue-700"/></span>
          </Link>) : <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center"><Package className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-800">No services created</p><p className="mt-1 text-xs text-slate-500">There were no new service records on this day.</p></div>}
        </div>
        <div className="border-t border-slate-100 p-4 sm:px-6"><button type="button" onClick={() => setSelected(null)} className="min-h-12 w-full rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99]">Done</button></div>
      </section>
    </div>}
  </>;
}
