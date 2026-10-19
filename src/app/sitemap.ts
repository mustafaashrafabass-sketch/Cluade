import type { MetadataRoute } from "next";
import { catalog } from "@/lib/catalog/repository";
import { siteUrl } from "@/lib/company";
import { categoryPath, href, locales, productPath } from "@/lib/i18n";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const { products, categories, meta } = await catalog();
  const lastModified = meta.importedAt ? new Date(meta.importedAt) : undefined;

  const entry = (pathFor: (l: (typeof locales)[number]) => string, priority: number, modified?: Date) =>
    locales.map((locale) => ({
      url: `${base}${pathFor(locale)}`,
      lastModified: modified,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l === "ar" ? "ar-SA" : "en", `${base}${pathFor(l)}`])) },
    }));

  return [
    ...entry((l) => href(l), 1),
    ...entry((l) => href(l, "/products"), 0.9, lastModified),
    ...entry((l) => href(l, "/categories"), 0.8, lastModified),
    ...entry((l) => href(l, "/rfq"), 0.7),
    ...entry((l) => href(l, "/about"), 0.5),
    ...entry((l) => href(l, "/contact"), 0.6),
    ...entry((l) => href(l, "/privacy"), 0.2),
    ...categories.flatMap((c) => entry((l) => categoryPath(l, c.slug), 0.7, lastModified)),
    ...products.flatMap((p) => entry((l) => productPath(l, p.slug), 0.6, lastModified)),
  ];
}
