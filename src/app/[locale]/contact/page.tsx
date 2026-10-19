import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactDetails, ContactInline } from "@/components/layout/ContactDetails";
import { PageHeader } from "@/components/layout/PageHeader";
import { company } from "@/lib/company";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/contact", title: t.contact.title, description: t.contact.metaDescription });
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.contact.title}
        lead={t.contact.lead}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.nav.contact }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-6">
          <section className="rounded-[var(--radius-md)] border border-line bg-white p-6">
            <h2 className="mb-5 text-base font-semibold text-navy">{t.contact.detailsTitle}</h2>
            <ContactDetails locale={locale} t={t} location="contact_page" />
          </section>
          <section className="rounded-[var(--radius-md)] border border-line bg-navy p-6 text-white">
            <h2 className="text-base font-semibold">{t.home.boqTitle}</h2>
            <p className="mt-2 text-sm text-white/75">{t.home.boqBody}</p>
            <Link href={href(locale, "/rfq")} className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4">
              {t.home.boqCta} →
            </Link>
          </section>
        </aside>
        <div className="space-y-6">
          <section className="rounded-[var(--radius-md)] border border-line bg-white p-5 sm:p-8">
            <h2 className="mb-6 text-lg font-semibold text-navy">{t.contact.formTitle}</h2>
            <ContactForm locale={locale} t={{ form: t.form, nav: t.nav }} privacyHref={href(locale, "/privacy")} contactHint={<ContactInline t={t} />} />
          </section>
          {company.mapEmbedUrl ? (
            <section aria-label={t.contact.map} className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
              <iframe
                title={t.contact.map}
                src={company.mapEmbedUrl}
                className="aspect-[16/9] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
