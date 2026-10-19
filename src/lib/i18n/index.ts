import ar from "./dictionaries/ar";
import en, { type Dictionary } from "./dictionaries/en";
import { defaultLocale, isLocale, type Locale } from "./config";

export * from "./config";
export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Replace {placeholders} in a dictionary string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function formatNumber(locale: Locale, value: number) {
  // Western digits in both languages keep SKUs, quantities and prices consistent.
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA").format(value);
}

export function formatPrice(locale: Locale, amount: number, currency: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Localised path helper. `href(locale, "/products")` → "/en/products". */
export function href(locale: Locale, path = "/") {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

export function productPath(locale: Locale, slug: string) {
  return href(locale, `/products/${encodeURIComponent(slug)}`);
}

export function categoryPath(locale: Locale, slug: string) {
  return href(locale, `/categories/${encodeURIComponent(slug)}`);
}
