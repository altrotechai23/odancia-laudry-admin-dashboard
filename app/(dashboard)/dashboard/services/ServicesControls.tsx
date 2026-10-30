"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, LoaderCircle, Search } from "lucide-react";

type ServiceStatusFilter = "pending" | "ready_for_collection" | "collected" | "all";
type ServiceSort = "urgency" | "collection" | "express" | "newest";
type Filters = { status: ServiceStatusFilter; query: string; sort: ServiceSort };
const statusOptions: Array<{ value: ServiceStatusFilter; label: string }> = [
  { value: "all", label: "All" }, { value: "pending", label: "Pending" },
  { value: "ready_for_collection", label: "Ready" }, { value: "collected", label: "Collected" },
];
function buildUrl(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.sort !== "urgency") params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `/dashboard/services?${query}` : "/dashboard/services";
}
function statusLabel(status: ServiceStatusFilter) {
  return ({ pending: "Pending", ready_for_collection: "Ready for collection", collected: "Collected", all: "All services" })[status];
}
export default function ServicesControls({ query, status, sort }: { query: string; status: ServiceStatusFilter; sort: ServiceSort }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(query);
  const [sortDraft, setSortDraft] = useState<ServiceSort>(sort);
  const [statusDraft, setStatusDraft] = useState<ServiceStatusFilter>(status);
  function navigate(next: Filters) { startTransition(() => router.push(buildUrl(next), { scroll: false })); }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft.trim() !== query.trim()) navigate({ query: searchDraft, status: statusDraft, sort: sortDraft });
    }, 350);
    return () => window.clearTimeout(timer);
    // URL changes refresh query/status/sort and are synchronized above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);
  function changeSort(value: ServiceSort) { setSortDraft(value); navigate({ query: searchDraft, status: statusDraft, sort: value }); }
  function changeStatus(value: ServiceStatusFilter) { setStatusDraft(value); navigate({ query: searchDraft, status: value, sort: sortDraft }); }
  const hasFilters = Boolean(searchDraft.trim()) || statusDraft !== "all" || sortDraft !== "urgency";
  return <div className="border-b border-black/[0.06] p-4 sm:p-5">
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,0.9fr)] lg:items-end">
      <div className="w-full min-w-0"><label htmlFor="services-search" className="sr-only">Search services</label><div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input id="services-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search client, phone or service…" className="h-12 w-full rounded-2xl border border-black/[0.07] bg-neutral-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" />
      </div></div>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2"><label htmlFor="services-sort" className="inline-flex h-12 items-center gap-1.5 text-xs font-semibold text-neutral-500"><ArrowUpDown className="h-4 w-4" /> Sort</label>
        <select id="services-sort" value={sortDraft} onChange={(event) => changeSort(event.target.value as ServiceSort)} className="h-12 min-w-0 w-full rounded-2xl border border-black/[0.07] bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition focus:border-blue-500">
          <option value="urgency">Urgency (recommended)</option><option value="collection">Collection soonest</option><option value="express">Express first</option><option value="newest">Newest first</option>
        </select>
      </div>
    </div>
    <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter services by status">
      {statusOptions.map((option) => <button key={option.value} type="button" onClick={() => changeStatus(option.value)} aria-pressed={statusDraft === option.value} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-semibold transition active:scale-[0.98] ${statusDraft === option.value ? "border-blue-800 bg-blue-800 text-white shadow-sm" : "border-black/[0.07] bg-white text-neutral-600 hover:border-blue-200 hover:bg-blue-50"}`}>{option.label}</button>)}
    </div>
    <div className="mt-2 flex min-h-5 flex-wrap items-center gap-2" aria-live="polite">
      {isPending ? <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-800"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Updating service list…</span> : hasFilters ? <>
        <span className="text-[11px] text-neutral-400">Auto-updating</span>
        {searchDraft.trim() && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">Search: {searchDraft.trim()}</span>}
        {statusDraft !== "all" && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">Status: {statusLabel(statusDraft)}</span>}
        <button type="button" onClick={() => { setSearchDraft(""); setSortDraft("urgency"); setStatusDraft("all"); navigate({ query: "", status: "all", sort: "urgency" }); }} className="ml-1 min-h-9 px-2 text-[11px] font-medium text-neutral-500 underline-offset-2 transition hover:text-neutral-950 hover:underline">Clear filters</button>
      </> : <span className="text-[11px] text-neutral-400">Sorted by urgency · Changes apply automatically</span>}
    </div>
  </div>;
}
