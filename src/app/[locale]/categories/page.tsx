import type { Metadata } from "next";
import Link from "next/link";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonClass } from "@/components/ui/button";
import { getCategoryImage, getCategoryTree } from "@/lib/catalog/repository";
import { getDictionary, href, resolveLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[locale]/categories">): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  return pageMetadata({ locale, path: "/categories", title: t.categories.title, description: t.categories.metaDescription });
}

export default async function CategoriesPage({ params }: PageProps<"/[locale]/categories">) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const { top } = await getCategoryTree();
  const images = await Promise.all(top.map(({ category }) => getCategoryImage(category)));

  return (
    <>
      <PageHeader
        title={t.categories.title}
        lead={t.categories.lead}
        breadcrumbs={[{ name: t.nav.home, href: href(locale) }, { name: t.categories.title }]}
        breadcrumbLabel={t.a11y.breadcrumb}
      />
      <div className="container-page py-10">
        {top.length ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {top.map(({ category, count }, i) => (
              <li key={category.id}>
                <CategoryCard category={category} image={images[i]} count={count} locale={locale} t={t} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong bg-white px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">{t.catalog.emptyCatalogTitle}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate">{t.catalog.emptyCatalogBody}</p>
            <Link href={href(locale, "/rfq")} className={buttonClass("primary", "md", "mt-6")}>{t.nav.submitBoq}</Link>
          </div>
        )}
      </div>
    </>
  );
}
