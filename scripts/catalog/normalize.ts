import { slugify } from "../../src/lib/catalog/text.ts";
import type {
  CatalogMeta,
  Category,
  Localized,
  Product,
  ProductAttribute,
  ProductImage,
  Redirect,
} from "../../src/lib/catalog/types.ts";

/** What every source adapter produces. Facts only — nothing is inferred here. */
export interface RawCategory {
  sourceId: string;
  name: Localized;
  slug?: string;
  parentSourceId?: string;
  description?: Localized;
  image?: ProductImage;
  url?: string;
  order?: number;
}

export interface RawProduct {
  sourceId: string;
  name: Localized;
  slug?: string;
  sku?: string;
  partNumber?: string;
  brand?: string;
  categorySourceIds: string[];
  summary?: Localized;
  description?: Localized;
  images: ProductImage[];
  attributes: ProductAttribute[];
  price?: { amount: number; currency: string; includesVat?: boolean };
  url?: string;
  /** Additional legacy URLs that should redirect to this product (e.g. Arabic permalink). */
  extraUrls?: string[];
  featured?: boolean;
}

export interface SourceResult {
  system: string;
  baseUrl: string | null;
  categories: RawCategory[];
  products: RawProduct[];
  failures: { url: string; reason: string }[];
}

export interface ImportReport {
  source: string;
  baseUrl: string | null;
  importedAt: string;
  totals: { products: number; categories: number; redirects: number };
  duplicatesRemoved: { sourceId: string; keptAs: string; reason: string }[];
  skuConflicts: { sku: string; productIds: string[] }[];
  missing: {
    images: string[];
    sku: string[];
    category: string[];
    description: string[];
    brand: number;
    price: number;
    arabicName: number;
    englishName: number;
  };
  invalidPrices: { productId: string; raw: string }[];
  failures: { url: string; reason: string }[];
}

const clean = (s: string | undefined) => {
  const t = s?.replace(/\s+/g, " ").trim();
  return t ? t : undefined;
};

function cleanLocalized(v: Localized | undefined): Localized | undefined {
  if (!v) return undefined;
  const out: Localized = {};
  if (v.en?.trim()) out.en = v.en.trim();
  if (v.ar?.trim()) out.ar = v.ar.trim();
  return out.en || out.ar ? out : undefined;
}

function safeSlug(input: string | undefined, fallback: string): string {
  let decoded = input ?? "";
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // keep as-is
  }
  return slugify(decoded) || slugify(fallback) || "item";
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = base;
  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
  used.add(slug);
  return slug;
}

/** Path of an old URL, decoded, without trailing slash — the form the proxy matches. */
export function legacyPath(url: string | undefined, base: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url, base ?? "https://example.invalid");
    let p = decodeURIComponent(u.pathname);
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "/" ? undefined : p;
  } catch {
    return undefined;
  }
}

function legacyLocale(url: string | undefined): "en" | "ar" {
  if (!url) return "en";
  return /(^|\/)ar(\/|$)|[?&]lang=ar\b/.test(url.replace(/^https?:\/\/[^/]+/, "")) ? "ar" : "en";
}

export function normalize(result: SourceResult, importedAt: string) {
  const report: ImportReport = {
    source: result.system,
    baseUrl: result.baseUrl,
    importedAt,
    totals: { products: 0, categories: 0, redirects: 0 },
    duplicatesRemoved: [],
    skuConflicts: [],
    missing: { images: [], sku: [], category: [], description: [], brand: 0, price: 0, arabicName: 0, englishName: 0 },
    invalidPrices: [],
    failures: result.failures,
  };

  // Categories
  const usedCategorySlugs = new Set<string>();
  const categoryIdBySource = new Map<string, string>();
  const categories: Category[] = [];
  for (const raw of result.categories) {
    if (categoryIdBySource.has(raw.sourceId)) continue;
    const name = cleanLocalized(raw.name);
    if (!name) continue;
    const id = `cat-${slugify(raw.sourceId) || categories.length + 1}`;
    categoryIdBySource.set(raw.sourceId, id);
    categories.push({
      id,
      slug: uniqueSlug(safeSlug(raw.slug, name.en ?? name.ar ?? raw.sourceId), usedCategorySlugs),
      name,
      description: cleanLocalized(raw.description),
      image: raw.image,
      sourceUrl: raw.url,
      order: raw.order ?? categories.length,
    });
  }
  // Resolve parents after all ids exist; drop references to unknown or self parents.
  result.categories.forEach((raw) => {
    const id = categoryIdBySource.get(raw.sourceId);
    const parent = raw.parentSourceId ? categoryIdBySource.get(raw.parentSourceId) : undefined;
    const cat = categories.find((c) => c.id === id);
    if (cat && parent && parent !== id) cat.parentId = parent;
  });

  // Products
  const usedSlugs = new Set<string>();
  const seenSource = new Map<string, string>();
  const seenSkuName = new Map<string, string>();
  const bySku = new Map<string, string[]>();
  const products: Product[] = [];
  const redirects: Redirect[] = [];

  for (const raw of result.products) {
    const name = cleanLocalized(raw.name);
    if (!name) {
      report.failures.push({ url: raw.url ?? raw.sourceId, reason: "product has no name" });
      continue;
    }
    const sku = clean(raw.sku);
    const id = `${result.system}-${slugify(raw.sourceId) || products.length + 1}`;

    if (seenSource.has(raw.sourceId)) {
      report.duplicatesRemoved.push({ sourceId: raw.sourceId, keptAs: seenSource.get(raw.sourceId)!, reason: "same source id" });
      continue;
    }
    // Demonstrable duplicate: same SKU AND same name (case/space-insensitive).
    const skuNameKey = sku ? `${sku.toLowerCase()}|${(name.en ?? name.ar ?? "").toLowerCase().replace(/\s+/g, " ")}` : undefined;
    if (skuNameKey && seenSkuName.has(skuNameKey)) {
      const kept = seenSkuName.get(skuNameKey)!;
      report.duplicatesRemoved.push({ sourceId: raw.sourceId, keptAs: kept, reason: "same SKU and name" });
      const legacy = legacyPath(raw.url, result.baseUrl);
      const keptProduct = products.find((p) => p.id === kept);
      if (legacy && keptProduct) redirects.push({ from: legacy, to: `/${legacyLocale(raw.url)}/products/${encodeURIComponent(keptProduct.slug)}` });
      continue;
    }

    const images: ProductImage[] = [];
    const seenImg = new Set<string>();
    for (const img of raw.images) {
      if (!img.src || seenImg.has(img.src)) continue;
      seenImg.add(img.src);
      images.push({ ...img, alt: cleanLocalized(img.alt) });
    }

    let price: Product["price"];
    if (raw.price) {
      if (Number.isFinite(raw.price.amount) && raw.price.amount > 0) {
        price = { ...raw.price, amount: Math.round(raw.price.amount * 100) / 100, observedAt: importedAt };
      } else {
        report.invalidPrices.push({ productId: id, raw: String(raw.price.amount) });
      }
    }

    const categoryIds = [...new Set(raw.categorySourceIds.map((s) => categoryIdBySource.get(s)).filter((v): v is string => Boolean(v)))];
    const slug = uniqueSlug(safeSlug(raw.slug, name.en ?? name.ar ?? sku ?? raw.sourceId), usedSlugs);

    const product: Product = {
      id,
      slug,
      name,
      sku,
      partNumber: clean(raw.partNumber),
      brand: clean(raw.brand),
      categoryIds,
      summary: cleanLocalized(raw.summary),
      description: cleanLocalized(raw.description),
      images,
      attributes: raw.attributes
        .map((a) => ({ ...a, values: [...new Set(a.values.map((v) => v.trim()).filter(Boolean))] }))
        .filter((a) => a.values.length && (a.label.en || a.label.ar)),
      price,
      featured: raw.featured || undefined,
      source: { system: result.system, id: raw.sourceId, url: raw.url, importedAt },
    };
    products.push(product);
    seenSource.set(raw.sourceId, id);
    if (skuNameKey) seenSkuName.set(skuNameKey, id);
    if (sku) bySku.set(sku.toLowerCase(), [...(bySku.get(sku.toLowerCase()) ?? []), id]);

    for (const url of [raw.url, ...(raw.extraUrls ?? [])]) {
      const legacy = legacyPath(url, result.baseUrl);
      const to = `/${legacyLocale(url)}/products/${encodeURIComponent(slug)}`;
      if (legacy && decodeURIComponent(to) !== legacy) redirects.push({ from: legacy, to });
    }

    if (!images.length) report.missing.images.push(id);
    if (!sku) report.missing.sku.push(id);
    if (!categoryIds.length) report.missing.category.push(id);
    if (!product.description && !product.summary) report.missing.description.push(id);
    if (!product.brand) report.missing.brand++;
    if (!price) report.missing.price++;
    if (!name.ar) report.missing.arabicName++;
    if (!name.en) report.missing.englishName++;
  }

  for (const cat of categories) {
    const legacy = legacyPath(cat.sourceUrl, result.baseUrl);
    const to = `/${legacyLocale(cat.sourceUrl)}/categories/${encodeURIComponent(cat.slug)}`;
    if (legacy && decodeURIComponent(to) !== legacy) redirects.push({ from: legacy, to });
  }

  for (const [sku, ids] of bySku) if (ids.length > 1) report.skuConflicts.push({ sku, productIds: ids });

  // One target per legacy path; first wins.
  const firstByPath = new Map<string, Redirect>();
  for (const r of redirects) if (!firstByPath.has(r.from)) firstByPath.set(r.from, r);
  const uniqueRedirects = [...firstByPath.values()];
  // Drop categories that end up with no products and no children.
  const used = new Set(products.flatMap((p) => p.categoryIds));
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories) {
      if (c.parentId && used.has(c.id) && !used.has(c.parentId)) {
        used.add(c.parentId);
        changed = true;
      }
    }
  }
  const keptCategories = categories.filter((c) => used.has(c.id));

  report.totals = { products: products.length, categories: keptCategories.length, redirects: uniqueRedirects.length };
  const meta: CatalogMeta = {
    source: result.system,
    sourceBaseUrl: result.baseUrl,
    importedAt,
    productCount: products.length,
    categoryCount: keptCategories.length,
  };
  return { products, categories: keptCategories, redirects: uniqueRedirects, meta, report };
}

/** Apply manual Arabic/English names for categories (data/catalog/category-translations.json). */
export function applyCategoryTranslations(categories: RawCategory[], map: Record<string, Localized>) {
  for (const c of categories) {
    const key = c.slug ?? c.sourceId;
    const tr = map[key] ?? map[c.sourceId];
    if (tr) c.name = { ...c.name, ...Object.fromEntries(Object.entries(tr).filter(([, v]) => v)) };
  }
}
