/**
 * Validate the imported catalog.
 *
 *   npm run catalog:validate                 # structural checks
 *   npm run catalog:validate -- --sample 25  # also compare 25 random products with the live source pages
 *   npm run catalog:validate -- --dir tests/fixtures/catalog
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fetchText } from "./catalog/http.ts";
import { decodeEntities, extractJsonLd, hasType } from "./catalog/html.ts";
import type { Category, Product, Redirect } from "../src/lib/catalog/types.ts";

const { values: args } = parseArgs({
  options: {
    dir: { type: "string", default: "data/catalog" },
    sample: { type: "string", default: "0" },
  },
});

const errors: string[] = [];
const warnings: string[] = [];

async function load<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(path.resolve(args.dir!), file), "utf8")) as T;
}

function checkStructure(products: Product[], categories: Category[], redirects: Redirect[]) {
  const catIds = new Set(categories.map((c) => c.id));
  const slugs = new Set<string>();
  const ids = new Set<string>();
  for (const c of categories) {
    if (c.parentId && !catIds.has(c.parentId)) errors.push(`category ${c.id}: unknown parent ${c.parentId}`);
    if (!c.name.en && !c.name.ar) errors.push(`category ${c.id}: no name`);
  }
  for (const p of products) {
    if (ids.has(p.id)) errors.push(`duplicate product id ${p.id}`);
    ids.add(p.id);
    if (slugs.has(p.slug)) errors.push(`duplicate product slug ${p.slug}`);
    slugs.add(p.slug);
    if (!p.name.en && !p.name.ar) errors.push(`${p.id}: no name`);
    if (/[/?#\s]/.test(p.slug)) errors.push(`${p.id}: slug "${p.slug}" contains URL-unsafe characters`);
    if (p.price && !(p.price.amount > 0)) errors.push(`${p.id}: non-positive price ${p.price.amount}`);
    if (p.price && !/^[A-Z]{3}$/.test(p.price.currency)) errors.push(`${p.id}: invalid currency ${p.price.currency}`);
    for (const id of p.categoryIds) if (!catIds.has(id)) errors.push(`${p.id}: unknown category ${id}`);
    for (const img of p.images) {
      if (!/^(https:\/\/|\/)/.test(img.src)) errors.push(`${p.id}: image must be https or root-relative: ${img.src}`);
    }
    if (!p.images.length) warnings.push(`${p.id}: no image`);
  }
  const froms = new Set<string>();
  for (const r of redirects) {
    if (froms.has(r.from)) errors.push(`duplicate redirect source ${r.from}`);
    froms.add(r.from);
    if (!r.to.startsWith("/en/") && !r.to.startsWith("/ar/")) errors.push(`redirect ${r.from} → ${r.to}: target must be localised`);
    if (r.from === r.to) errors.push(`redirect loop ${r.from}`);
  }
}

async function compareSample(products: Product[], n: number) {
  const withUrl = products.filter((p) => p.source.url);
  const sample = withUrl.sort(() => Math.random() - 0.5).slice(0, n);
  let matched = 0;
  for (const p of sample) {
    const { status, text } = await fetchText(p.source.url!).catch(() => ({ status: 0, text: null }));
    if (!text) {
      warnings.push(`sample ${p.id}: source page unavailable (HTTP ${status})`);
      continue;
    }
    const html = decodeEntities(text);
    const ld = extractJsonLd(text).find((o) => hasType(o, "Product"));
    const issues: string[] = [];
    const name = p.name.en ?? p.name.ar ?? "";
    if (!html.includes(name) && !html.includes(p.name.ar ?? "\u0000")) issues.push("name not found on source page");
    if (p.sku && !html.includes(p.sku)) issues.push(`SKU ${p.sku} not found on source page`);
    if (p.price && ld) {
      const offers = (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers) as Record<string, unknown> | undefined;
      const live = Number(offers?.price);
      if (Number.isFinite(live) && Math.abs(live - p.price.amount) > 0.009) issues.push(`price changed: catalog ${p.price.amount}, live ${live}`);
    }
    if (issues.length) errors.push(`sample ${p.id} (${p.source.url}): ${issues.join("; ")}`);
    else matched++;
  }
  console.log(`Sample check: ${matched}/${sample.length} products match their source page.`);
}

async function main() {
  const [products, categories, redirects] = await Promise.all([
    load<Product[]>("products.json"),
    load<Category[]>("categories.json"),
    load<Redirect[]>("redirects.json").catch(() => [] as Redirect[]),
  ]);
  console.log(`Validating ${products.length} products, ${categories.length} categories, ${redirects.length} redirects in ${args.dir}`);
  if (products.length === 0) warnings.push("catalog is empty — run npm run catalog:import first");
  checkStructure(products, categories, redirects);
  const n = Number(args.sample);
  if (n > 0) await compareSample(products, n);

  const shownWarnings = warnings.slice(0, 20);
  for (const w of shownWarnings) console.warn(`  ⚠ ${w}`);
  if (warnings.length > shownWarnings.length) console.warn(`  … ${warnings.length - shownWarnings.length} more warnings`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  console.log(errors.length ? `✖ ${errors.length} error(s)` : "✓ Catalog is valid");
  process.exit(errors.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
