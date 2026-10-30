export default function ReportsLoading() {
  return <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8" aria-label="Loading reports">
    <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200"/><div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-200"/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((x)=><div key={x} className="h-32 animate-pulse rounded-3xl border border-slate-100 bg-white"/>)}</div>
    <div className="h-72 animate-pulse rounded-3xl border border-slate-100 bg-white"/>
  </main>;
}
