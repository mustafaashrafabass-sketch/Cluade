import type { Metadata } from "next";
import Link from "next/link";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { HeroIllustration } from "@/components/home/HeroIllustration";
import { buttonClass } from "@/components/ui/button";
import { ArrowIcon, BoltIcon, ChevronDownIcon, CheckIcon, GearIcon, LayersIcon, RulerIcon, SearchIcon, TruckIcon } from "@/components/ui/icons";
import { catalog, getCategoryImage, getCategoryTree, getFeaturedProducts } from "@/lib/catalog/repository";
import { company, siteUrl } from "@/lib/company";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { jsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return pageMetadata({ locale, path: "/" });
}

const whyIcons = [LayersIcon, RulerIcon, GearIcon, TruckIcon];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const [{ top }, featured, data] = await Promise.all([getCategoryTree(), getFeaturedProducts(8), catalog()]);
  const shownCategories = top.slice(0, 8);
  const categoryImages = await Promise.all(shownCategories.map(({ category }) => getCategoryImage(category)));
  const catalogReady = data.products.length > 0;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.legalName.en ?? "Almanfz",
    alternateName: company.legalName.ar ?? undefined,
    url: siteUrl(),
    logo: `${siteUrl()}/icon.svg`,
    email: company.email ?? undefined,
    telephone: company.phone ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: "Riyadh", addressCountry: "SA" },
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(orgLd)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="blueprint-grid absolute inset-0" aria-hidden />
        <div className="absolute inset-y-0 end-0 w-1/2 bg-gradient-to-l from-navy-800/60 to-transparent rtl:bg-gradient-to-r" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8db0ff] rtl:text-sm rtl:tracking-normal">{t.hero.eyebrow}</p>
            <h1 className="mt-4 text-[2.25rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem] rtl:leading-[1.25]">
              {t.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{t.hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href(locale, "/products")} className={buttonClass("primary", "lg")}>
                {t.hero.primaryCta}
                <ArrowIcon size={18} className="rtl:-scale-x-100" />
              </Link>
              <Link href={href(locale, "/quote")} className={buttonClass("outline-inverse", "lg")}>{t.hero.secondaryCta}</Link>
            </div>
            <form action={href(locale, "/products")} role="search" className="mt-8 max-w-xl">
              <div className="relative">
                <label className="block">
                <span className="sr-only">{t.search.label}</span>
                <SearchIcon size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate" />
                <input
                  type="search"
                  name="q"
                  placeholder={t.hero.searchHint}
                  className="h-14 w-full rounded-[var(--radius-md)] border-0 bg-white ps-12 pe-28 text-[16px] text-ink shadow-[var(--shadow-raised)] placeholder:text-slate focus:outline-none focus:ring-4 focus:ring-blue/40"
                />
                </label>
                <button type="submit" className={buttonClass("primary", "md", "absolute end-1.5 top-1.5")}>{t.search.submit}</button>
              </div>
            </form>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
              {t.hero.pillars.map((p, i) => {
                const Icon = [BoltIcon, GearIcon, LayersIcon, RulerIcon][i] ?? BoltIcon;
                return (
                  <li key={p} className="flex items-center gap-2">
                    <Icon size={16} className="text-[#8db0ff]" />
                    {p}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="hidden lg:block">
            <HeroIllustration />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section aria-labelledby="home-categories" className="py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="home-categories" className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.categoriesTitle}</h2>
              <p className="mt-2 text-slate">{t.home.categoriesLead}</p>
            </div>
            {shownCategories.length ? (
              <Link href={href(locale, "/categories")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue hover:underline">
                {t.home.viewAllCategories}
                <ArrowIcon size={16} className="rtl:-scale-x-100" />
              </Link>
            ) : null}
          </div>
          {shownCategories.length ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {shownCategories.map(({ category, count }, i) => (
                <li key={category.id}>
                  <CategoryCard category={category} image={categoryImages[i]} count={count} locale={locale} t={t} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 grid gap-6 rounded-[var(--radius-md)] border border-line bg-white p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="text-lg font-semibold text-ink">{t.home.catalogPendingTitle}</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{t.home.catalogPendingBody}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={href(locale, "/rfq")} className={buttonClass("primary")}>{t.nav.submitBoq}</Link>
                <Link href={href(locale, "/contact")} className={buttonClass("secondary")}>{t.nav.contact}</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured products */}
      {featured.length ? (
        <section aria-labelledby="home-featured" className="border-y border-line bg-white py-16 sm:py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 id="home-featured" className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.featuredTitle}</h2>
                <p className="mt-2 max-w-2xl text-slate">{t.home.featuredLead}</p>
              </div>
              <Link href={href(locale, "/products")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue hover:underline">
                {t.home.viewAllProducts}
                <ArrowIcon size={16} className="rtl:-scale-x-100" />
              </Link>
            </div>
            <div className="mt-8">
              <ProductGrid products={featured} categoryById={data.categoryById} locale={locale} t={t} />
            </div>
          </div>
        </section>
      ) : null}

      {/* Why Almanfz */}
      <section aria-labelledby="home-why" className={`py-16 sm:py-20 ${featured.length ? "" : "border-t border-line bg-white"}`}>
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">{t.meta.siteName}</p>
            <h2 id="home-why" className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.whyTitle}</h2>
            <p className="mt-2 text-slate">{t.home.whyLead}</p>
          </div>
          <ul className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {t.home.why.map((w, i) => {
              const Icon = whyIcons[i] ?? LayersIcon;
              return (
                <li key={w.title} className="bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] bg-blue-50 text-blue">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-semibold text-ink">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate">{w.body}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* BOQ */}
      <section aria-labelledby="home-boq" className="container-page">
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-navy text-white">
          <div className="blueprint-grid absolute inset-0" aria-hidden />
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-14">
            <div>
              <h2 id="home-boq" className="text-2xl font-bold tracking-tight sm:text-[2rem]">{t.home.boqTitle}</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">{t.home.boqBody}</p>
              <Link href={href(locale, "/rfq")} className={buttonClass("inverse", "lg", "mt-8")}>
                {t.home.boqCta}
                <ArrowIcon size={18} className="rtl:-scale-x-100" />
              </Link>
            </div>
            <ul className="space-y-3 rounded-[var(--radius-md)] border border-white/15 bg-white/[0.04] p-6">
              {t.home.boqPoints.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-white/85">
                  <CheckIcon size={18} className="mt-px shrink-0 text-[#8db0ff]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="home-how" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="home-how" className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.howTitle}</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {t.home.how.map((step, i) => (
              <li key={step.title} className="relative border-t-2 border-navy pt-5">
                <span className="ltr-id text-sm font-semibold text-blue">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Company intro + FAQ */}
      <section className="border-t border-line bg-white py-16 sm:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div aria-labelledby="home-intro">
            <p className="eyebrow">{t.nav.about}</p>
            <h2 id="home-intro" className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.introTitle}</h2>
            <p className="mt-4 leading-relaxed text-ink/80">{t.home.introBody}</p>
            <Link href={href(locale, "/about")} className={buttonClass("secondary", "md", "mt-6")}>{t.home.introCta}</Link>
          </div>
          <div aria-labelledby="home-faq">
            <h2 id="home-faq" className="text-xl font-semibold text-navy">{t.home.faqTitle}</h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {t.faq.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-ink hover:text-blue [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDownIcon size={18} className="shrink-0 text-slate transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-5 pe-8 text-sm leading-relaxed text-slate">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="home-cta" className="bg-paper py-16 sm:py-20">
        <div className="container-page flex flex-col items-start justify-between gap-6 border-s-4 border-blue ps-6 md:flex-row md:items-center">
          <div>
            <h2 id="home-cta" className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t.home.closingTitle}</h2>
            <p className="mt-2 text-slate">{t.home.closingBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={href(locale, catalogReady ? "/products" : "/rfq")} className={buttonClass("primary", "lg")}>
              {catalogReady ? t.hero.primaryCta : t.nav.submitBoq}
            </Link>
            <Link href={href(locale, "/quote")} className={buttonClass("secondary", "lg")}>{t.nav.requestQuote}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
