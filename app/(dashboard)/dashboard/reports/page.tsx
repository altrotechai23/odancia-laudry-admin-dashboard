import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Banknote, BriefcaseBusiness, ChartNoAxesCombined, CircleDollarSign, Clock3, Download, PackageCheck, TrendingUp, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/get-current-user";
import { getServices, type LaundryService } from "@/lib/services/get-services";
import ReportRange from "./ReportRange";

type Props = { searchParams: Promise<{ range?: string }> };
const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 }).format(value);
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
export default async function ReportsPage({ searchParams }: Props) {
  const profile = await requireUser();
  if (profile.role === "staff") redirect("/dashboard/services");
  const params = await searchParams;
  const range = ["7", "30", "90", "all"].includes(params.range ?? "") ? params.range! : "30";
  return <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Business intelligence</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Reports</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">A clear view of service volume, collections and outstanding balances. Designed for a quick glance on iPhone, iPad and desktop.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><ReportRange value={range}/><Link href="/dashboard/payments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 active:scale-[0.98]"><Banknote className="h-4 w-4"/> Open payments <ArrowRight className="h-4 w-4"/></Link></div>
      </header>
      <Suspense fallback={<ReportsBodySkeleton/>}><ReportsBody range={range}/></Suspense>
    </div>
  </main>;
}
async function ReportsBody({ range }: { range: string }) {
  const { services } = await getServices();
  const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
  const rows = services.filter((s) => Date.parse(s.created_at) >= cutoff).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
  const serviceValue = rows.reduce((sum,s)=>sum+s.price,0);
  const received = rows.reduce((sum,s)=>sum+s.amount_paid,0);
  const outstanding = rows.reduce((sum,s)=>sum+s.balance,0);
  const completed = rows.filter((s)=>s.service_status === "collected").length;
  const pending = rows.filter((s)=>s.service_status === "pending").length;
  const ready = rows.filter((s)=>s.service_status === "ready_for_collection").length;
  const avg = rows.length ? serviceValue / rows.length : 0;
  const maxCount = Math.max(1, pending, ready, completed);
  const daily = Array.from({length: 7}, (_, index) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (6-index));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const count = rows.filter((s)=>s.created_at.slice(0,10)===key).length;
    return { label: d.toLocaleDateString("en-ZA",{weekday:"short"}), count };
  });
  return <div className="mt-7 space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Service value" value={money(serviceValue)} note={`${rows.length} services in this period`} icon={<BriefcaseBusiness className="h-5 w-5"/>} accent="blue"/>
      <Metric title="Payments received" value={money(received)} note="Recorded payments for these services" icon={<CircleDollarSign className="h-5 w-5"/>} accent="emerald"/>
      <Metric title="Outstanding balance" value={money(outstanding)} note="Balance still due" icon={<Clock3 className="h-5 w-5"/>} accent="amber"/>
      <Metric title="Average service value" value={money(avg)} note="Average value per service" icon={<TrendingUp className="h-5 w-5"/>} accent="violet"/>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-950">Service activity</h2><p className="mt-1 text-xs text-slate-500">New services over the last seven days</p></div><span className="rounded-xl bg-blue-50 p-2.5 text-blue-800"><ChartNoAxesCombined className="h-5 w-5"/></span></div>
        <div className="mt-7 flex h-44 items-end gap-3 sm:gap-5" role="img" aria-label="Bar chart of new services for the last seven days">{daily.map((day)=><div key={day.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-slate-700">{day.count}</span><div className="flex w-full max-w-12 flex-1 items-end overflow-hidden rounded-t-xl bg-slate-100"><div className="w-full rounded-t-xl bg-gradient-to-t from-blue-800 to-blue-500 transition-all duration-500" style={{height:`${Math.max(day.count ? 12 : 3, day.count / Math.max(1,...daily.map(d=>d.count))*100)}%`}}/></div><span className="text-[11px] text-slate-500">{day.label}</span></div>)}</div>
        <p className="mt-4 text-[11px] text-slate-400">Daily counts are based on service creation date.</p>
      </section>
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-slate-950">Service status</h2><p className="mt-1 text-xs text-slate-500">Current status of services in the selected period</p></div><PackageCheck className="h-5 w-5 text-slate-400"/></div>
        <div className="mt-6 space-y-5"><StatusRow label="Pending" count={pending} total={rows.length} color="bg-amber-400"/><StatusRow label="Ready for collection" count={ready} total={rows.length} color="bg-blue-600"/><StatusRow label="Collected" count={completed} total={rows.length} color="bg-emerald-500"/></div>
        <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Collected</p><p className="mt-1 text-2xl font-semibold text-slate-950">{completed}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Not yet collected</p><p className="mt-1 text-2xl font-semibold text-slate-950">{pending+ready}</p></div></div>
      </section>
    </div>
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-base font-semibold text-slate-950">Recent services</h2><p className="mt-1 text-xs text-slate-500">Latest entries included in this report</p></div><a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvFor(rows))}`} download="odancia-services-report.csv" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Download className="h-4 w-4"/> Export CSV</a></div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Service</th><th className="px-5 py-3 font-semibold">Client</th><th className="px-5 py-3 font-semibold">Created</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-right font-semibold">Value</th><th className="px-5 py-3 text-right font-semibold">Balance</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.slice(0,12).map((s)=><tr key={s.id} className="transition hover:bg-slate-50/80"><td className="px-5 py-4"><Link className="font-semibold text-blue-800 hover:underline" href={`/dashboard/services/${s.id}`}>{s.service_number ?? s.id.slice(0,8)}</Link></td><td className="px-5 py-4"><p className="font-medium text-slate-900">{s.client_name}</p><p className="mt-0.5 text-xs text-slate-400">{s.phone}</p></td><td className="px-5 py-4 text-slate-600">{dateLabel(s.created_at)}</td><td className="px-5 py-4"><StatusPill status={s.service_status}/></td><td className="px-5 py-4 text-right font-medium text-slate-900">{money(s.price)}</td><td className="px-5 py-4 text-right font-medium text-slate-700">{money(s.balance)}</td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><Users className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-800">No services for this period</p><p className="mt-1 text-xs text-slate-500">Try a wider reporting range.</p></div>}
      {rows.length>12 && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Showing 12 of {rows.length} services. Export CSV for the full list.</div>}
    </section>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-50/70 px-4 py-3 text-xs text-blue-900"><span>Report generated from current service records.</span><Link href="/dashboard/services" className="inline-flex min-h-9 items-center gap-1.5 font-semibold hover:underline">View all services <ArrowRight className="h-3.5 w-3.5"/></Link></div>
  </div>;
}
function Metric({title,value,note,icon,accent}:{title:string;value:string;note:string;icon:React.ReactNode;accent:string}) { const colors:Record<string,string>={blue:"bg-blue-50 text-blue-800",emerald:"bg-emerald-50 text-emerald-700",amber:"bg-amber-50 text-amber-700",violet:"bg-violet-50 text-violet-700"}; return <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{title}</span><span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${colors[accent]}`}>{icon}</span></div><p className="mt-5 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></section>; }
function StatusRow({label,count,total,color}:{label:string;count:number;total:number;color:string}) { const pct=total?Math.round(count/total*100):0; return <div><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-700">{label}</span><span className="tabular-nums text-slate-500">{count} · {pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color} transition-all duration-500`} style={{width:`${pct}%`}}/></div></div>; }
function StatusPill({status}:{status:LaundryService["service_status"]}) { const style=status==="collected"?"bg-emerald-50 text-emerald-700":status==="ready_for_collection"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-800"; const label=status==="collected"?"Collected":status==="ready_for_collection"?"Ready":"Pending"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{label}</span>; }
function csvFor(rows:LaundryService[]) { const quote=(value:unknown)=>`"${String(value??"").replace(/"/g,'""')}"`; return [["Service","Client","Phone","Created","Status","Value ZAR","Paid ZAR","Balance ZAR"],...rows.map(s=>[s.service_number??s.id,s.client_name,s.phone,s.created_at,s.service_status,s.price,s.amount_paid,s.balance])].map(row=>row.map(quote).join(",")).join("\r\n"); }
function ReportsBodySkeleton() { return <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((i)=><div key={i} className="h-32 animate-pulse rounded-3xl bg-white"/>)}<div className="h-64 animate-pulse rounded-3xl bg-white sm:col-span-2 xl:col-span-4"/></div>; }
