export default function NotificationsSettingsLoading() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading notification settings">
      <div className="mx-auto max-w-[1000px] animate-pulse motion-reduce:animate-none">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="mt-7 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-neutral-200" />
          <div className="flex-1">
            <div className="h-8 w-56 rounded bg-neutral-200" />
            <div className="mt-3 h-4 max-w-xl rounded bg-neutral-100" />
            <div className="mt-2 h-4 max-w-md rounded bg-neutral-100" />
          </div>
        </div>
        <div className="mt-7 h-32 rounded-3xl border border-neutral-100 bg-white p-6">
          <div className="h-4 w-48 rounded bg-neutral-200" />
          <div className="mt-4 h-4 max-w-2xl rounded bg-neutral-100" />
        </div>
        <div className="mt-4 h-64 rounded-3xl border border-neutral-100 bg-white p-6">
          <div className="h-4 w-40 rounded bg-neutral-200" />
          <div className="mt-5 h-12 rounded-xl bg-neutral-100" />
          <div className="mt-4 h-11 w-36 rounded-xl bg-neutral-200" />
        </div>
      </div>
    </main>
  );
}
