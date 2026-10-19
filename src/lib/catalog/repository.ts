import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { buildIndex, type CatalogIndex } from "./query";
import type { CatalogMeta, Category, Product } from "./types";

/**
 * Server-only catalog access. Data lives in JSON files produced by
 * `npm run catalog:import` (see docs/MIGRATION.md). CATALOG_DATA_DIR lets
 * tests or a deployment point at another directory.
 */
function dataDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.CATALOG_DATA_DIR ?? "data/catalog");
}

interface Loaded {
  index: CatalogIndex;
  meta: CatalogMeta;
  products: Product[];
  bySlug: Map<string, Product>;
  byId: Map<string, Product>;
  categories: Category[];
  categoryById: Map<string, Category>;
}

let loaded: { version: number; data: Promise<Loaded> } | undefined;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(/*turbopackIgnore: true*/ dataDir(), file), "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

async function load(): Promise<Loaded> {
  const [products, categories, meta] = await Promise.all([
    readJson<Product[]>("products.json", []),
    readJson<Category[]>("categories.json", []),
    readJson<CatalogMeta>("meta.json", {
      source: null,
      sourceBaseUrl: null,
      importedAt: null,
      productCount: 0,
      categoryCount: 0,
    }),
  ]);
  categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    index: buildIndex(products, categories),
    meta,
    products,
    bySlug: new Map(products.map((p) => [p.slug, p])),
    byId: new Map(products.map((p) => [p.id, p])),
    categories,
    categoryById: new Map(categories.map((c) => [c.id, c])),
  };
}

/** Reloads automatically when products.json changes on disk (e.g. after a re-import). */
async function getCatalog(): Promise<Loaded> {
  let version = 0;
  try {
    version = (await stat(path.join(/*turbopackIgnore: true*/ dataDir(), "products.json"))).mtimeMs;
  } catch {
    // Missing file: treated as an empty catalog.
  }
  if (!loaded || loaded.version !== version) {
    const data = load();
    loaded = { version, data };
    data.catch(() => {
      if (loaded?.data === data) loaded = undefined;
    });
  }
  return loaded.data;
}

export const catalog = cache(getCatalog);

export async function getProductBySlug(slug: string) {
  return (await catalog()).bySlug.get(slug);
}

export async function getCategoryBySlug(slug: string) {
  return (await catalog()).index.categoryBySlug.get(slug);
}

/** Top-level categories (or all, if the source has no hierarchy) with product counts. */
export async function getCategoryTree() {
  const { categories, index } = await catalog();
  const counts = new Map<string, number>();
  for (const c of categories) {
    const ids = index.descendants.get(c.id) ?? new Set([c.id]);
    counts.set(
      c.id,
      index.products.filter((e) => e.product.categoryIds.some((id) => ids.has(id))).length,
    );
  }
  const top = categories.filter((c) => !c.parentId);
  return {
    top: top.map((c) => ({
      category: c,
      count: counts.get(c.id) ?? 0,
      children: categories.filter((x) => x.parentId === c.id).map((x) => ({ category: x, count: counts.get(x.id) ?? 0 })),
    })),
    counts,
  };
}

export async function getFeaturedProducts(limit = 8) {
  const { products } = await catalog();
  const featured = products.filter((p) => p.featured);
  const pool = featured.length ? featured : products.filter((p) => p.images.length > 0);
  return pool.slice(0, limit);
}

/** Representative image for a category: its own image, else the first product image in it. */
export async function getCategoryImage(category: Category) {
  if (category.image) return category.image;
  const { index } = await catalog();
  const ids = index.descendants.get(category.id) ?? new Set([category.id]);
  return index.products.find((e) => e.product.images.length && e.product.categoryIds.some((id) => ids.has(id)))
    ?.product.images[0];
}
