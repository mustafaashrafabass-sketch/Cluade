// WooCommerce Store API (public, no credentials): /wp-json/wc/store/v1/products
import { fetchJson } from "../http.ts";
import { decodeEntities, htmlToText, stripTags } from "../html.ts";
import type { RawCategory, RawProduct, SourceResult } from "../normalize.ts";

interface WooImage { src: string; alt?: string; name?: string }
interface WooTerm { id: number; name: string; slug: string; link?: string }
interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku?: string;
  short_description?: string;
  description?: string;
  prices?: { price?: string; regular_price?: string; currency_code?: string; currency_minor_unit?: number };
  images?: WooImage[];
  categories?: WooTerm[];
  brands?: WooTerm[];
  attributes?: { id: number; name: string; taxonomy?: string | null; terms?: { name: string }[] }[];
}
interface WooCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent?: number;
  image?: WooImage | null;
  permalink?: string;
}

const API = "/wp-json/wc/store/v1";

export async function detectWooCommerce(base: string): Promise<boolean> {
  const { data } = await fetchJson<unknown[]>(`${base}${API}/products?per_page=1`).catch(() => ({ data: null }));
  return Array.isArray(data);
}

async function paged<T>(url: string, limit: number): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page < 1000 && out.length < limit; page++) {
    const sep = url.includes("?") ? "&" : "?";
    const { status, data, headers } = await fetchJson<T[]>(`${url}${sep}per_page=100&page=${page}`);
    if (status === 400 && page > 1) break; // past the last page
    if (!Array.isArray(data)) throw new Error(`Unexpected response ${status} from ${url}`);
    out.push(...data);
    const totalPages = Number(headers.get("x-wp-totalpages") ?? "0");
    if (data.length < 100 || (totalPages && page >= totalPages)) break;
  }
  return out.slice(0, limit);
}

function wooPrice(p: WooProduct["prices"]) {
  if (!p?.price) return undefined;
  const minor = p.currency_minor_unit ?? 2;
  const amount = Number(p.price) / 10 ** minor;
  return { amount, currency: p.currency_code || "SAR" };
}

function toRaw(p: WooProduct, lang: "en" | "ar"): RawProduct {
  const attrs = (p.attributes ?? [])
    .filter((a) => a.terms?.length)
    .map((a) => ({
      key: (a.taxonomy || `attr-${a.id || a.name}`).toLowerCase(),
      label: { [lang]: decodeEntities(a.name) },
      values: (a.terms ?? []).map((t) => decodeEntities(t.name)),
    }));
  return {
    sourceId: String(p.id),
    name: { [lang]: stripTags(p.name) },
    slug: p.slug,
    sku: p.sku || undefined,
    brand: p.brands?.[0]?.name ? decodeEntities(p.brands[0].name) : undefined,
    categorySourceIds: (p.categories ?? []).map((c) => String(c.id)),
    summary: { [lang]: htmlToText(p.short_description) },
    description: { [lang]: htmlToText(p.description) },
    images: (p.images ?? []).map((i) => ({ src: i.src, alt: i.alt ? { [lang]: i.alt } : undefined })),
    attributes: attrs,
    price: wooPrice(p.prices),
    url: p.permalink,
  };
}

export async function importWooCommerce(
  base: string,
  opts: { limit: number; secondaryLang?: { lang: "en" | "ar"; query: string }; primaryLang: "en" | "ar" },
): Promise<SourceResult> {
  const failures: SourceResult["failures"] = [];
  const cats = await paged<WooCategory>(`${base}${API}/products/categories`, 10_000);
  const categories: RawCategory[] = cats.map((c, i) => ({
    sourceId: String(c.id),
    name: { [opts.primaryLang]: decodeEntities(c.name) },
    slug: c.slug,
    parentSourceId: c.parent ? String(c.parent) : undefined,
    description: c.description ? { [opts.primaryLang]: htmlToText(c.description) } : undefined,
    image: c.image?.src ? { src: c.image.src } : undefined,
    url: c.permalink,
    order: i,
  }));

  const list = await paged<WooProduct>(`${base}${API}/products`, opts.limit);
  const products = list.map((p) => toRaw(p, opts.primaryLang));

  // Optional second language (WPML/Polylang expose it via a query parameter).
  // Translations are merged by SKU only — the one identifier that is stable across languages.
  if (opts.secondaryLang) {
    const { lang, query } = opts.secondaryLang;
    try {
      const translated = await paged<WooProduct>(`${base}${API}/products?${query}`, opts.limit);
      const bySku = new Map(translated.filter((t) => t.sku).map((t) => [t.sku!.toLowerCase(), t]));
      let merged = 0;
      for (const p of products) {
        const t = p.sku ? bySku.get(p.sku.toLowerCase()) : undefined;
        if (!t) continue;
        const r = toRaw(t, lang);
        p.name = { ...p.name, ...r.name };
        p.summary = { ...p.summary, ...r.summary };
        p.description = { ...p.description, ...r.description };
        for (const a of p.attributes) {
          const match = r.attributes.find((x) => x.key === a.key);
          if (match) a.label = { ...a.label, ...match.label };
        }
        p.extraUrls = [t.permalink];
        merged++;
      }
      console.log(`  merged ${merged} ${lang} translations by SKU`);
    } catch (error) {
      failures.push({ url: `${base}${API}/products?${query}`, reason: `secondary language: ${(error as Error).message}` });
    }
  }

  return { system: "woocommerce", baseUrl: base, categories, products, failures };
}
