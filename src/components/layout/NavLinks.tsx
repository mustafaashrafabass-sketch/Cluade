"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, label }: { links: { href: string; label: string; exact?: boolean }[]; label: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className="relative inline-flex h-16 items-center px-3 text-sm font-medium text-ink/80 transition-colors hover:text-ink aria-[current=page]:text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-blue after:opacity-0 aria-[current=page]:after:opacity-100"
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
