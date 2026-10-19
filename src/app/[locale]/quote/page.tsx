import type { Metadata } from "next";
import { ContactInline } from "@/components/layout/ContactDetails";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuoteView } from "@/components/quote/QuoteView";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/quote">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/quote", title: t.quote.title, description: t.quote.metaDescription, noindex: true });
}

export default async function QuotePage({ params }: PageProps<"/[locale]/quote">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.quote.title}
        lead={t.quote.lead}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.quote.title }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page py-8 sm:py-10">
        <QuoteView
          locale={locale}
          t={{ quote: t.quote, form: t.form, product: t.product, a11y: t.a11y, nav: t.nav }}
          links={{ products: href(locale, "/products"), rfq: href(locale, "/rfq"), privacy: href(locale, "/privacy") }}
          contactHint={<ContactInline t={t} />}
        />
      </div>
    </>
  );
}
