"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { buttonClass } from "../ui/button";
import { CloseIcon, MenuIcon, SearchIcon } from "../ui/icons";

interface NavLink {
  href: string;
  label: string;
}

/** Mobile navigation in a native modal <dialog>: focus trapping and Esc come for free. */
export function MobileNav({
  links,
  cta,
  search,
  labels,
  dir,
}: {
  links: NavLink[];
  cta: NavLink;
  search: { action: string; placeholder: string; label: string; submit: string };
  labels: { open: string; close: string; nav: string };
  dir: "ltr" | "rtl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-ink hover:bg-navy/5 lg:hidden"
        aria-label={labels.open}
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        <MenuIcon size={22} />
      </button>
      <dialog
        ref={ref}
        aria-label={labels.nav}
        dir={dir}
        className="m-0 ms-auto h-dvh max-h-none w-[min(22rem,100%)] max-w-none bg-white p-0 text-ink backdrop:bg-navy-950/50 open:animate-fade-in"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-end border-b border-line px-4">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] hover:bg-navy/5"
              aria-label={labels.close}
              onClick={() => ref.current?.close()}
            >
              <CloseIcon size={22} />
            </button>
          </div>
          <form action={search.action} role="search" className="border-b border-line p-4">
            <label className="relative block">
              <span className="sr-only">{search.label}</span>
              <SearchIcon size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate" />
              <input
                type="search"
                name="q"
                placeholder={search.placeholder}
                className="h-11 w-full rounded-[var(--radius)] border border-line-strong bg-white ps-10 pe-3 text-[16px] placeholder:text-slate focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </label>
            <button type="submit" className="sr-only">{search.submit}</button>
          </form>
          <nav aria-label={labels.nav} className="flex-1 overflow-y-auto p-2">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={pathname === l.href ? "page" : undefined}
                    className="flex h-12 items-center rounded-[var(--radius)] px-3 text-base font-medium hover:bg-paper aria-[current=page]:text-blue"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-line p-4">
            <Link href={cta.href} className={buttonClass("primary", "lg", "w-full")}>
              {cta.label}
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
