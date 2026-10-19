import Link from "next/link";
import { ChevronIcon } from "../ui/icons";

export function Breadcrumbs({ items, label }: { items: { name: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-slate">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.name}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-ink hover:underline">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "truncate font-medium text-ink" : ""}>
                  {item.name}
                </span>
              )}
              {!last ? <ChevronIcon size={14} className="shrink-0 text-line-strong rtl:rotate-180" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
