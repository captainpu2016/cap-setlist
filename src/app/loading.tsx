export default function Loading() {
  return (
    <main className="min-h-screen bg-noise bg-halftone">
      <header className="border-b border-stage-700/60 px-6 py-14 sm:px-10">
        <div className="h-3 w-28 animate-pulse rounded bg-stage-800" />
        <div className="mt-4 h-14 w-64 max-w-full animate-pulse rounded bg-stage-800" />
        <div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-stage-800" />
        <div className="mt-6 h-3 w-32 animate-pulse rounded bg-stage-800" />
      </header>

      <section className="px-6 py-10 sm:px-10">
        <div className="mb-8 h-28 animate-pulse rounded-lg bg-stage-800" />
        <div className="mb-4 h-5 w-24 animate-pulse rounded bg-stage-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-stage-800" />
          ))}
        </div>
      </section>
    </main>
  );
}
