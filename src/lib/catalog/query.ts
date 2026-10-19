import { compact, normalizeForSearch, pick } from "./text.ts";
import type { Category, Locale, Product } from "./types.ts";

export type SortKey = "relevance" | "name-asc" | "name-desc" | "price-asc" | "price-desc";
export const SORT_KEYS: SortKey[] = ["relevance", "name-asc", "name-desc", "price-asc", "price-desc"];

export interface CatalogQuery {
  q?: string;
  /** Category slug. Includes products from child categories. */
  category?: string;
  brands?: string[];
  /** Attribute filters: key -> accepted values (OR within a key, AND across keys). */
  attributes?: Record<string, string[]>;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface Facet {
  value: string;
  count: number;
}

export interface AttributeFacet {
  key: string;
  label: Product["attributes"][number]["label"];
  values: Facet[];
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  brands: Facet[];
  attributes: AttributeFacet[];
  hasPrices: boolean;
}

interface IndexedProduct {
  product: Product;
  /** Normalised name text in both languages. */
  name: string;
  /** Identifiers (SKU, part number) in compact form. */
  ids: string[];
  /** Everything searchable, normalised. */
  haystack: string;
}

export interface CatalogIndex {
  products: IndexedProduct[];
  categories: Category[];
  categoryBySlug: Map<string, Category>;
  descendants: Map<string, Set<string>>;
}

export function buildIndex(products: Product[], categories: Category[]): CatalogIndex {
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const children = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
  }
  const descendants = new Map<string, Set<string>>();
  for (const c of categories) {
    const set = new Set<string>([c.id]);
    const stack = [c.id];
    while (stack.length) {
      for (const child of children.get(stack.pop()!) ?? []) {
        if (!set.has(child)) {
          set.add(child);
          stack.push(child);
        }
      }
    }
    descendants.set(c.id, set);
  }

  const categoryNames = new Map(categories.map((c) => [c.id, `${c.name.en ?? ""} ${c.name.ar ?? ""}`]));

  const indexed = products.map((product) => {
    const name = normalizeForSearch(`${product.name.en ?? ""} ${product.name.ar ?? ""}`);
    const ids = [product.sku, product.partNumber].filter((v): v is string => Boolean(v)).map(compact);
    const haystack = normalizeForSearch(
      [
        product.name.en,
        product.name.ar,
        product.sku,
        product.partNumber,
        product.brand,
        product.summary?.en,
        product.summary?.ar,
        ...product.categoryIds.map((id) => categoryNames.get(id)),
        ...product.attributes.flatMap((a) => a.values),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return { product, name, ids, haystack };
  });

  return { products: indexed, categories, categoryBySlug, descendants };
}

/** Score a product for a query; 0 means "no match". */
function score(entry: IndexedProduct, terms: string[], compactQuery: string): number {
  let total = 0;
  if (compactQuery.length >= 2 && entry.ids.some((id) => id === compactQuery)) total += 100;
  else if (compactQuery.length >= 3 && entry.ids.some((id) => id.includes(compactQuery))) total += 40;

  for (const term of terms) {
    if (entry.name.includes(term)) total += entry.name.startsWith(term) ? 12 : 8;
    else if (entry.haystack.includes(term)) total += 3;
    else if (total < 40) return 0; // every term must match somewhere unless an identifier matched
  }
  return total;
}

function priceOf(p: Product): number | undefined {
  return p.price && p.price.amount > 0 ? p.price.amount : undefined;
}

export function queryCatalog(index: CatalogIndex, query: CatalogQuery, locale: Locale): CatalogResult {
  const pageSize = Math.min(Math.max(query.pageSize ?? 24, 1), 96);
  let entries = index.products;

  if (query.category) {
    const cat = index.categoryBySlug.get(query.category);
    const allowed = cat ? index.descendants.get(cat.id) : undefined;
    entries = allowed ? entries.filter((e) => e.product.categoryIds.some((id) => allowed.has(id))) : [];
  }

  const scores = new Map<IndexedProduct, number>();
  const rawQ = (query.q ?? "").trim().slice(0, 120);
  if (rawQ) {
    const terms = normalizeForSearch(rawQ).split(" ").filter(Boolean);
    const compactQuery = compact(rawQ);
    entries = entries.filter((e) => {
      const s = score(e, terms, compactQuery);
      if (s > 0) scores.set(e, s);
      return s > 0;
    });
  }

  // Facets are computed before brand/attribute filters are applied to their own
  // dimension, so users can widen a selection without clearing everything.
  const brandFilter = new Set(query.brands ?? []);
  const attrFilters = Object.entries(query.attributes ?? {}).filter(([, v]) => v.length > 0);

  const matchesBrand = (p: Product) => brandFilter.size === 0 || (p.brand !== undefined && brandFilter.has(p.brand));
  const matchesAttrs = (p: Product, skipKey?: string) =>
    attrFilters.every(
      ([key, values]) =>
        key === skipKey || p.attributes.some((a) => a.key === key && a.values.some((v) => values.includes(v))),
    );

  const brandCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.product.brand && matchesAttrs(e.product)) {
      brandCounts.set(e.product.brand, (brandCounts.get(e.product.brand) ?? 0) + 1);
    }
  }

  const attrCounts = new Map<string, { label: AttributeFacet["label"]; counts: Map<string, number> }>();
  for (const e of entries) {
    if (!matchesBrand(e.product)) continue;
    for (const a of e.product.attributes) {
      if (!matchesAttrs(e.product, a.key)) continue;
      const bucket = attrCounts.get(a.key) ?? { label: a.label, counts: new Map() };
      for (const v of a.values) bucket.counts.set(v, (bucket.counts.get(v) ?? 0) + 1);
      attrCounts.set(a.key, bucket);
    }
  }

  entries = entries.filter((e) => matchesBrand(e.product) && matchesAttrs(e.product));

  const hasPrices = entries.some((e) => priceOf(e.product) !== undefined);
  const sort = query.sort ?? (rawQ ? "relevance" : "name-asc");
  const collator = new Intl.Collator(locale === "ar" ? "ar" : "en", { numeric: true, sensitivity: "base" });
  const byName = (a: IndexedProduct, b: IndexedProduct) =>
    collator.compare(pick(a.product.name, locale), pick(b.product.name, locale));

  const sorted = [...entries];
  switch (sort) {
    case "name-asc":
      sorted.sort(byName);
      break;
    case "name-desc":
      sorted.sort((a, b) => byName(b, a));
      break;
    case "price-asc":
    case "price-desc": {
      const dir = sort === "price-asc" ? 1 : -1;
      // Products without a public price always sort last.
      sorted.sort((a, b) => {
        const pa = priceOf(a.product);
        const pb = priceOf(b.product);
        if (pa === undefined && pb === undefined) return byName(a, b);
        if (pa === undefined) return 1;
        if (pb === undefined) return -1;
        return (pa - pb) * dir || byName(a, b);
      });
      break;
    }
    default:
      sorted.sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || byName(a, b));
  }

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.trunc(query.page ?? 1), 1), pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map((e) => e.product);

  const facetSort = (a: Facet, b: Facet) => b.count - a.count || collator.compare(a.value, b.value);

  return {
    items,
    total,
    page,
    pageCount,
    pageSize,
    hasPrices,
    brands: [...brandCounts].map(([value, count]) => ({ value, count })).sort(facetSort),
    attributes: [...attrCounts]
      // Only offer attributes that actually narrow the result set.
      .filter(([, b]) => b.counts.size > 1 && b.counts.size <= 40)
      .map(([key, b]) => ({
        key,
        label: b.label,
        values: [...b.counts].map(([value, count]) => ({ value, count })).sort(facetSort),
      }))
      .slice(0, 6),
  };
}

export function relatedProducts(index: CatalogIndex, product: Product, limit = 4): Product[] {
  const cats = new Set(product.categoryIds);
  return index.products
    .map((e) => e.product)
    .filter((p) => p.id !== product.id && p.categoryIds.some((id) => cats.has(id)))
    .sort((a, b) => Number(Boolean(b.images.length)) - Number(Boolean(a.images.length)))
    .slice(0, limit);
}

/** Parse URL search params into a validated query. Unknown values are dropped. */
export function parseCatalogSearchParams(params: Record<string, string | string[] | undefined>): CatalogQuery {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const sortRaw = first(params.sort);
  const attributes: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("attr.")) attributes[key.slice(5)] = all(value).map((s) => s.slice(0, 120));
  }
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q: first(params.q)?.slice(0, 120),
    category: first(params.category)?.slice(0, 200),
    brands: all(params.brand).map((s) => s.slice(0, 120)),
    attributes,
    sort: SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : undefined,
    page: Number.isFinite(page) ? page : 1,
  };
}
