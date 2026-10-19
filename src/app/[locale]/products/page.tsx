import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/products">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const sp = await searchParams;
  // Filtered and searched variations are not separate indexable pages.
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return pageMetadata({ locale, path: "/products", title: t.catalog.title, description: t.catalog.metaDescription, noindex: filtered });
}

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/products">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return (
    <>
      <PageHeader
        title={t.catalog.title}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.catalog.title }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page py-8">
        <CatalogView locale={locale} t={t} searchParams={await searchParams} />
      </div>
    </>
  );
}
