import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/button";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/about", title: t.about.title, description: t.about.metaDescription });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.about.title}
        lead={t.about.lead}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.nav.about }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-10">
          {t.about.sections.map((s, i) => (
            <section key={s.title} className="grid gap-3 border-t border-line pt-8 first:border-t-0 first:pt-0 sm:grid-cols-[3rem_1fr]">
              <span className="ltr-id text-sm font-semibold text-blue">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-xl font-semibold text-navy">{s.title}</h2>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink/80">{s.body}</p>
              </div>
            </section>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={href(locale, "/products")} className={buttonClass("primary", "lg")}>{t.hero.primaryCta}</Link>
            <Link href={href(locale, "/contact")} className={buttonClass("secondary", "lg")}>{t.contact.title}</Link>
          </div>
        </div>
        <aside className="h-fit rounded-[var(--radius-md)] border border-line bg-white p-6">
          <h2 className="text-base font-semibold text-navy">{t.about.audienceTitle}</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {t.about.audience.map((a) => (
              <li key={a} className="py-2.5 text-ink/85">{a}</li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
