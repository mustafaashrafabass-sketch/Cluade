import type { Metadata } from "next";
import { ContactInline } from "@/components/layout/ContactDetails";
import { PageHeader } from "@/components/layout/PageHeader";
import { RfqForm } from "@/components/forms/RfqForm";
import { CheckIcon } from "@/components/ui/icons";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/rfq">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/rfq", title: t.rfq.title, description: t.rfq.metaDescription });
}

export default async function RfqPage({ params }: PageProps<"/[locale]/rfq">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.rfq.title}
        lead={t.rfq.lead}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.nav.submitBoq }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <section className="rounded-[var(--radius-md)] border border-line bg-white p-5 sm:p-8">
          <RfqForm
            locale={locale}
            t={{ form: t.form, nav: t.nav, quote: t.quote }}
            privacyHref={href(locale, "/privacy")}
            contactHint={<ContactInline t={t} />}
          />
        </section>
        <aside className="rounded-[var(--radius-md)] border border-line bg-navy p-6 text-white lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">{t.rfq.stepsTitle}</h2>
          <ul className="mt-4 space-y-3 text-sm text-white/80">
            {t.rfq.steps.map((s) => (
              <li key={s} className="flex gap-2.5">
                <CheckIcon size={18} className="mt-px shrink-0 text-[#7aa7ff]" />
                {s}
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-2 border-t border-white/15 pt-5 text-xs text-white/60">
            {t.home.boqPoints.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </aside>
      </div>
    </>
  );
}
