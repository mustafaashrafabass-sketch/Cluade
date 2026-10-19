import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/layout/PageHeader";
import { catalog } from "@/lib/catalog/repository";
import { pick } from "@/lib/catalog/text";
import type { Category } from "@/lib/catalog/types";
import { categoryPath, getDictionary, href, resolveLocale } from "@/lib/i18n";
import { breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

export const dynamicParams = true;

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const { index } = await catalog();
  const category = index.categoryBySlug.get(decodeSlug(slug));
  if (!category) return {};
  const t = getDictionary(locale);
  const name = pick(category.name, locale);
  const filtered = Object.keys(await searchParams).some((k) => k !== "page");
  return pageMetadata({
    locale,
    path: `/categories/${encodeURIComponent(category.slug)}`,
    title: name,
    description: (pick(category.description, locale) || `${name} — ${t.meta.tagline}. ${t.catalog.metaDescription}`).slice(0, 160),
    noindex: filtered,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const t = getDictionary(locale);
  const { index, categoryById, categories } = await catalog();
  const category = index.categoryBySlug.get(decodeSlug(slug));
  if (!category) notFound();

  const trail: Category[] = [];
  for (let c = category.parentId ? categoryById.get(category.parentId) : undefined; c && trail.length < 6; c = c.parentId ? categoryById.get(c.parentId) : undefined) {
    trail.unshift(c);
  }
  const children = categories.filter((c) => c.parentId === category.id);
  const name = pick(category.name, locale);
  const crumbs = [
    { name: t.nav.home, href: href(locale) },
    { name: t.categories.title, href: href(locale, "/categories") },
    ...trail.map((c) => ({ name: pick(c.name, locale), href: categoryPath(locale, c.slug) })),
    { name, href: categoryPath(locale, category.slug) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd(crumbs.map((c) => ({ name: c.name, path: c.href }))))} />
      <PageHeader title={name} lead={pick(category.description, locale) || undefined} breadcrumbs={crumbs} breadcrumbLabel={t.a11y.breadcrumb}>
        {children.length ? (
          <nav aria-label={t.categories.subcategories} className="mt-5">
            <ul className="flex flex-wrap gap-2">
              {children.map((c) => (
                <li key={c.id}>
                  <Link href={categoryPath(locale, c.slug)} className="inline-flex h-9 items-center rounded-full border border-line-strong bg-white px-3.5 text-sm font-medium hover:border-navy">
                    {pick(c.name, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </PageHeader>
      <div className="container-page py-8">
        <CatalogView locale={locale} t={t} searchParams={await searchParams} category={category} />
      </div>
    </>
  );
}
