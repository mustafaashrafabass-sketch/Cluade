"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon, FilterIcon } from "../ui/icons";

/** Filters are rendered once: collapsible on mobile, always visible on desktop. */
export function FilterPanel({ label, activeCount, children }: { label: string; activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-white lg:border-0 lg:bg-transparent">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center gap-2 px-4 text-sm font-semibold lg:hidden"
      >
        <FilterIcon size={18} />
        {label}
        {activeCount ? <span className="ltr-id rounded-full bg-blue px-2 text-xs text-white">{activeCount}</span> : null}
        <ChevronDownIcon size={16} className={`ms-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} className={`${open ? "block" : "hidden"} border-t border-line p-4 lg:block lg:border-0 lg:p-0`}>
        {children}
      </div>
    </div>
  );
}
