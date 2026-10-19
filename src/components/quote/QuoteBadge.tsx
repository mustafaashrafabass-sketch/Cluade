"use client";

import Link from "next/link";
import { ClipboardIcon } from "../ui/icons";
import { useQuote } from "./quote-store";

export function QuoteBadge({ href, label, countLabel }: { href: string; label: string; countLabel: string }) {
  const { items, ready } = useQuote();
  const count = items.length;
  return (
    <Link
      href={href}
      aria-label={countLabel.replace("{count}", String(count))}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-ink hover:bg-navy/5"
    >
      <ClipboardIcon size={22} />
      {ready && count > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 end-0 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-blue px-1 text-[0.6875rem] font-bold text-white tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
