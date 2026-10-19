export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-6 w-40 animate-pulse rounded bg-line" />
      <div className="mt-8 h-11 animate-pulse rounded bg-line/70" />
      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
            <div className="aspect-square animate-pulse bg-paper" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-line" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-line" />
              <div className="h-9 animate-pulse rounded bg-line/70" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
