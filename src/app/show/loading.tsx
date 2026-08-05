export default function Loading() {
  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="h-3 w-16 animate-pulse rounded bg-stage-800" />
        <div className="mt-6 h-3 w-16 animate-pulse rounded bg-stage-800" />
        <div className="mt-2 h-10 w-40 animate-pulse rounded bg-stage-800" />
        <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded bg-stage-800" />

        <div className="mt-10 space-y-10">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-5 w-16 animate-pulse rounded bg-stage-800" />
              <div className="h-40 animate-pulse rounded-lg bg-stage-800" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
