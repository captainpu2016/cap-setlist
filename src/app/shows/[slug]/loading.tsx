export default function Loading() {
  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="h-3 w-20 animate-pulse rounded bg-stage-800" />

        <div className="mt-6 flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-stage-800" />
          <div className="flex-1">
            <div className="h-3 w-28 animate-pulse rounded bg-stage-800" />
            <div className="mt-2 h-9 w-72 max-w-full animate-pulse rounded bg-stage-800" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded bg-stage-800" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <div className="h-10 w-40 animate-pulse rounded-full bg-stage-800" />
          <div className="h-10 w-24 animate-pulse rounded-full bg-stage-800" />
        </div>

        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-stage-800" />
          ))}
        </div>
      </div>
    </main>
  );
}
