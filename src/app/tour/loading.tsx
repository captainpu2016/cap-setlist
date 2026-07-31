export default function Loading() {
  return (
    <main className="min-h-screen bg-noise bg-halftone px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <div className="h-3 w-20 animate-pulse rounded bg-stage-800" />
        <div className="mt-6 h-3 w-24 animate-pulse rounded bg-stage-800" />
        <div className="mt-2 h-10 w-56 animate-pulse rounded bg-stage-800" />
        <div className="mt-3 h-3 w-64 max-w-full animate-pulse rounded bg-stage-800" />

        <div className="mt-10 h-56 animate-pulse rounded-lg bg-stage-800" />
        <div className="mt-4 h-[420px] animate-pulse rounded-lg bg-stage-800" />

        <div className="mt-10 h-48 animate-pulse rounded-lg bg-stage-800" />
      </div>
    </main>
  );
}
