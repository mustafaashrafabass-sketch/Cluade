import raw from "../../content/company.json";
import type { Locale } from "./catalog/types";

type MaybeLocalized = { en: string | null; ar: string | null };

interface CompanyProfile {
  legalName: MaybeLocalized;
  commercialRegistration: string | null;
  vatNumber: string | null;
  phone: string | null;
  email: string | null;
  salesEmail: string | null;
  whatsapp: string | null;
  address: MaybeLocalized;
  city: MaybeLocalized;
  workingHours: MaybeLocalized;
  mapEmbedUrl: string | null;
  mapLinkUrl: string | null;
  social: Record<string, string | null>;
}

export const company = raw as unknown as CompanyProfile;

export function localized(value: MaybeLocalized, locale: Locale): string | null {
  return value[locale] ?? value[locale === "ar" ? "en" : "ar"] ?? null;
}

/** Digits only, as required by wa.me links. Null when no verified number is configured. */
export function whatsappNumber(): string | null {
  const digits = company.whatsapp?.replace(/\D/g, "");
  return digits && digits.length >= 8 ? digits : null;
}

export function whatsappLink(message: string): string | null {
  const number = whatsappNumber();
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

export function telLink(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
