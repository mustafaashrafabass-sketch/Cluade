"use client";

/**
 * Analytics events. Pushed to window.dataLayer (GTM) and gtag (GA4) only when
 * NEXT_PUBLIC_GTM_ID or NEXT_PUBLIC_GA4_ID is configured AND the visitor
 * accepted analytics. Only catalog/product data is sent — never form fields,
 * names, emails, phone numbers, notes or file names.
 */
export type AnalyticsEvent =
  | { name: "view_item"; item_id: string; item_name: string; item_category?: string; item_brand?: string }
  | { name: "search"; search_term: string; results: number }
  | { name: "view_item_list"; item_list_id: string; item_list_name: string }
  | { name: "add_to_quote"; item_id: string; item_name: string; quantity: number }
  | { name: "view_quote_list"; items: number }
  | { name: "generate_lead"; form: "quote" | "rfq" | "contact"; items?: number; has_attachment?: boolean }
  | { name: "contact_click"; method: "phone" | "email" | "whatsapp"; location: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = "almanfz.consent.v1";

export function analyticsConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_GTM_ID || process.env.NEXT_PUBLIC_GA4_ID);
}

export function track(event: AnalyticsEvent) {
  if (typeof window === "undefined" || !analyticsConfigured()) return;
  const { name, ...params } = event;
  if ("search_term" in params) params.search_term = params.search_term.slice(0, 100);
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });
  if (process.env.NEXT_PUBLIC_GA4_ID && !process.env.NEXT_PUBLIC_GTM_ID) window.gtag?.("event", name, params);
}
