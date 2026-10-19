import type { Locale, Localized } from "./types.ts";

/** Pick the requested language, falling back to the other one. */
export function pick(value: Localized | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] ?? value[locale === "ar" ? "en" : "ar"] ?? "";
}

/** True when the value only exists in the other language (used to set `lang`). */
export function pickLang(value: Localized | undefined, locale: Locale): Locale {
  if (value?.[locale]) return locale;
  return locale === "ar" ? "en" : "ar";
}

const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * Normalise text for search: case-fold, strip Arabic diacritics/tatweel,
 * unify common Arabic letter variants and collapse punctuation so that
 * "NYY-4x16" matches "nyy 4x16".
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Compact form without spaces, so "ABC 123" also matches "abc123". */
export function compact(input: string): string {
  return normalizeForSearch(input).replace(/\s+/g, "");
}

export function slugify(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
