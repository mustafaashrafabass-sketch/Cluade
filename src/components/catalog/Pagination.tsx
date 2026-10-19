import Link from "next/link";
import { format, type Dictionary } from "@/lib/i18n";
import { ChevronIcon } from "../ui/icons";

export function Pagination({
  page,
  pageCount,
  hrefFor,
  t,
  label,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  t: Dictionary["catalog"];
  label: string;
}) {
  if (pageCount <= 1) return null;
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const list = [...pages].sort((a, b) => a - b);
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-[var(--radius)] border px-3 text-sm font-medium";

  return (
    <nav aria-label={label} className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className={`${item} gap-1 border-line bg-white hover:border-navy`}>
              <ChevronIcon size={16} className="rotate-180 rtl:rotate-0" />
              <span className="hidden sm:inline">{t.previous}</span>
            </Link>
          ) : null}
        </li>
        {list.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            {i > 0 && p - list[i - 1] > 1 ? <span className="px-1 text-slate" aria-hidden>…</span> : null}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={`${item} ltr-id ${p === page ? "border-navy bg-navy text-white" : "border-line bg-white hover:border-navy"}`}
            >
              {p}
            </Link>
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link href={hrefFor(page + 1)} rel="next" className={`${item} gap-1 border-line bg-white hover:border-navy`}>
              <span className="hidden sm:inline">{t.next}</span>
              <ChevronIcon size={16} className="rtl:rotate-180" />
            </Link>
          ) : null}
        </li>
      </ul>
      <p className="text-xs text-slate">{format(t.page, { page, count: pageCount })}</p>
    </nav>
  );
}
