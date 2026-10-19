import type { Metadata } from "next";
import { siteUrl } from "./company";
import { getDictionary, href, locales, ogLocale, type Locale } from "./i18n";

/** Page metadata with canonical URL, hreflang alternates and Open Graph. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  images,
  noindex,
}: {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/products". */
  path: string;
  title?: string;
  description?: string;
  images?: string[];
  noindex?: boolean;
}): Metadata {
  const t = getDictionary(locale);
  const fullTitle = title ? `${title} | ${t.meta.siteName}` : t.meta.defaultTitle;
  const desc = description ?? t.meta.defaultDescription;
  const languages = Object.fromEntries(locales.map((l) => [l === "ar" ? "ar-SA" : "en", href(l, path)]));
  return {
    title: { absolute: fullTitle },
    description: desc,
    alternates: {
      canonical: href(locale, path),
      languages: { ...languages, "x-default": href("en", path) },
    },
    openGraph: {
      type: "website",
      siteName: t.meta.siteName,
      title: fullTitle,
      description: desc,
      url: href(locale, path),
      locale: ogLocale[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocale[l]),
      images: images?.length ? images.map((url) => ({ url })) : undefined,
    },
    twitter: { card: images?.length ? "summary_large_image" : "summary", title: fullTitle, description: desc },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${siteUrl()}${path}`;
}

/** Serialise JSON-LD safely for a <script> tag. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
