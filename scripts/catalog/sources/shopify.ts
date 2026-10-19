// Shopify public product feed: /products.json and /collections.json
import { fetchJson } from "../http.ts";
import { htmlToText, stripTags } from "../html.ts";
import { slugify } from "../../../src/lib/catalog/text.ts";
import type { RawCategory, RawProduct, SourceResult } from "../normalize.ts";

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  options?: { name: string; values: string[] }[];
  variants?: { sku?: string; price?: string }[];
  images?: { src: string; alt?: string | null; width?: number; height?: number }[];
}

export async function detectShopify(base: string) {
  const { data } = await fetchJson<{ products?: unknown[] }>(`${base}/products.json?limit=1`).catch(() => ({ data: null }));
  return Array.isArray(data?.products);
}

export async function importShopify(base: string, opts: { limit: number; lang: "en" | "ar"; currency?: string }): Promise<SourceResult> {
  const { lang } = opts;
  const products: ShopifyProduct[] = [];
  for (let page = 1; page < 400 && products.length < opts.limit; page++) {
    const { data } = await fetchJson<{ products: ShopifyProduct[] }>(`${base}/products.json?limit=250&page=${page}`);
    if (!data?.products?.length) break;
    products.push(...data.products);
    if (data.products.length < 250) break;
  }

  const categories = new Map<string, RawCategory>();
  const raw: RawProduct[] = products.slice(0, opts.limit).map((p) => {
    const type = p.product_type?.trim();
    if (type && !categories.has(type)) {
      categories.set(type, { sourceId: `type-${slugify(type)}`, name: { [lang]: type }, slug: slugify(type), order: categories.size });
    }
    const variants = p.variants ?? [];
    // A single public price only when every variant shares it; otherwise "Request Price".
    const prices = [...new Set(variants.map((v) => v.price).filter(Boolean))];
    const skus = [...new Set(variants.map((v) => v.sku).filter(Boolean))] as string[];
    return {
      sourceId: String(p.id),
      name: { [lang]: stripTags(p.title) },
      slug: p.handle,
      sku: skus.length === 1 ? skus[0] : undefined,
      brand: p.vendor || undefined,
      categorySourceIds: type ? [`type-${slugify(type)}`] : [],
      description: { [lang]: htmlToText(p.body_html) },
      images: (p.images ?? []).map((i) => ({ src: i.src, alt: i.alt ? { [lang]: i.alt } : undefined, width: i.width, height: i.height })),
      attributes: (p.options ?? [])
        .filter((o) => !(o.name === "Title" && o.values.length === 1 && o.values[0] === "Default Title"))
        .map((o) => ({ key: slugify(o.name), label: { [lang]: o.name }, values: o.values })),
      // products.json does not state the currency, so prices are only kept when --currency is given.
      price: prices.length === 1 && opts.currency ? { amount: Number(prices[0]), currency: opts.currency } : undefined,
      url: `${base}/products/${p.handle}`,
    };
  });

  const failures: SourceResult["failures"] = [];
  if (!opts.currency && products.some((p) => p.variants?.some((v) => Number(v.price) > 0))) {
    failures.push({ url: `${base}/products.json`, reason: "prices skipped: pass --currency to import them" });
  }
  return { system: "shopify", baseUrl: base, categories: [...categories.values()], products: raw, failures };
}
