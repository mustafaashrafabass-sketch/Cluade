import Link from "next/link";
import { Suspense } from "react";
import { dirOf, href, type Dictionary, type Locale } from "@/lib/i18n";
import { QuoteBadge } from "../quote/QuoteBadge";
import { buttonClass } from "../ui/button";
import { SearchIcon } from "../ui/icons";
import { Logo } from "../ui/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const links = [
    { href: href(locale), label: t.nav.home, exact: true },
    { href: href(locale, "/products"), label: t.nav.products },
    { href: href(locale, "/categories"), label: t.nav.categories },
    { href: href(locale, "/about"), label: t.nav.about },
    { href: href(locale, "/contact"), label: t.nav.contact },
  ];
  const quoteHref = href(locale, "/quote");
  const switcher = (
    <LanguageSwitcher
      locale={locale}
      label={t.nav.otherLanguageName}
      ariaLabel={(locale === "en" ? "تغيير اللغة إلى العربية" : "Switch language to English")}
    />
  );

  return (
    <>
      <div className="bg-navy text-white/85">
        <p className="container-page py-2 text-center text-xs leading-relaxed sm:text-[0.8125rem]">{t.announcement}</p>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-page flex h-16 items-center gap-3">
          <Link href={href(locale)} className="me-2 shrink-0 rounded-[var(--radius)]" aria-label={`${t.meta.siteName} — ${t.nav.home}`}>
            <Logo tagline={t.meta.tagline} />
          </Link>

          <NavLinks links={links} label={t.a11y.mainNav} />

          <form action={href(locale, "/products")} role="search" className="ms-auto hidden min-w-0 flex-1 md:block lg:max-w-xs xl:max-w-sm">
            <label className="relative block">
              <span className="sr-only">{t.search.label}</span>
              <SearchIcon size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate" />
              <input
                type="search"
                name="q"
                placeholder={t.search.shortPlaceholder}
                className="h-10 w-full rounded-[var(--radius)] border border-line bg-paper ps-10 pe-3 text-sm placeholder:text-slate focus:border-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </label>
          </form>

          <div className="ms-auto flex items-center gap-1 md:ms-0">
            <Suspense fallback={null}>
              <div className="hidden sm:block">{switcher}</div>
            </Suspense>
            <QuoteBadge href={quoteHref} label={t.nav.quoteList} countLabel={t.a11y.quoteListWithCount} />
            <Link href={quoteHref} className={buttonClass("primary", "md", "ms-1 hidden lg:inline-flex")}>
              {t.nav.requestQuote}
            </Link>
            <MobileNav
              dir={dirOf(locale)}
              links={[...links, { href: quoteHref, label: t.nav.quoteList }, { href: href(locale, "/rfq"), label: t.nav.submitBoq }]}
              cta={{ href: quoteHref, label: t.nav.requestQuote }}
              search={{
                action: href(locale, "/products"),
                placeholder: t.search.shortPlaceholder,
                label: t.search.label,
                submit: t.search.submit,
              }}
              labels={{ open: t.a11y.openMenu, close: t.a11y.closeMenu, nav: t.a11y.mainNav }}
            />
          </div>
        </div>
        <div className="border-t border-line sm:hidden">
          <div className="container-page flex h-11 items-center justify-between">
            <Suspense fallback={null}>{switcher}</Suspense>
            <Link href={href(locale, "/rfq")} className="text-sm font-semibold text-blue hover:underline">
              {t.nav.submitBoq}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

