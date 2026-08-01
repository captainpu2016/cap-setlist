export default function Loading() {
  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="h-3 w-16 animate-pulse rounded bg-stage-800" />
        <div className="mt-6 h-3 w-16 animate-pulse rounded bg-stage-800" />
        <div className="mt-2 h-10 w-40 animate-pulse rounded bg-stage-800" />
        <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded bg-stage-800" />
        <div className="mt-8 h-11 w-full animate-pulse rounded-md bg-stage-800" />
      </div>
    </main>
  );
}
