"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { GlobeIcon } from "../ui/icons";

/** Switches to the same page in the other language and remembers the choice. */
export function LanguageSwitcher({
  locale,
  label,
  ariaLabel,
  className = "",
}: {
  locale: Locale;
  label: string;
  ariaLabel: string;
  className?: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const other: Locale = locale === "en" ? "ar" : "en";
  const target = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) + (search ? `?${search}` : "");

  return (
    <a
      href={target}
      hrefLang={other}
      lang={other}
      aria-label={ariaLabel}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      className={`inline-flex h-10 items-center gap-1.5 rounded-[var(--radius)] px-2.5 text-sm font-medium text-ink hover:bg-navy/5 ${className}`}
    >
      <GlobeIcon size={18} className="text-slate" />
      <span>{label}</span>
    </a>
  );
}
