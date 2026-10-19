import type { Locale } from "../catalog/types.ts";

export type { Locale };
export const locales: Locale[] = ["en", "ar"];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export const htmlLang: Record<Locale, string> = { en: "en", ar: "ar-SA" };
export const ogLocale: Record<Locale, string> = { en: "en_US", ar: "ar_SA" };
