/**
 * Catalog import pipeline. Repeatable: re-running replaces data/catalog/*.json.
 *
 *   npm run catalog:import -- --source auto --base https://almanfz.com
 *   npm run catalog:import -- --source woocommerce --base https://almanfz.com --secondary-lang ar --secondary-query lang=ar
 *   npm run catalog:import -- --source sitemap --base https://almanfz.com --match "/product/"
 *   npm run catalog:import -- --source file --file ./export.csv --base https://almanfz.com --currency SAR
 *
 * Options: --out <dir> (default data/catalog) · --limit <n> · --dry-run · --download-images
 *          --primary-lang en|ar · --concurrency <n> · --no-alternates
 * See docs/MIGRATION.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { localizeImages } from "./catalog/images.ts";
import { applyCategoryTranslations, normalize, type SourceResult } from "./catalog/normalize.ts";
import { importFile } from "./catalog/sources/file.ts";
import { detectShopify, importShopify } from "./catalog/sources/shopify.ts";
import { importSitemap } from "./catalog/sources/sitemap.ts";
import { detectWooCommerce, importWooCommerce } from "./catalog/sources/woocommerce.ts";
import type { Localized } from "../src/lib/catalog/types.ts";

const { values: args } = parseArgs({
  options: {
    source: { type: "string", default: "auto" },
    base: { type: "string" },
    file: { type: "string" },
    out: { type: "string", default: "data/catalog" },
    limit: { type: "string", default: "100000" },
    match: { type: "string", default: "/(product|products|p)/" },
    "primary-lang": { type: "string", default: "en" },
    "secondary-lang": { type: "string" },
    "secondary-query": { type: "string" },
    currency: { type: "string" },
    concurrency: { type: "string", default: "3" },
    "download-images": { type: "boolean", default: false },
    "no-alternates": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

async function readJsonIfExists<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function main() {
  const base = args.base?.replace(/\/+$/, "") ?? null;
  const limit = Number(args.limit);
  const primaryLang = args["primary-lang"] === "ar" ? "ar" : "en";
  let source = args.source!;
  let result: SourceResult;

  if (source === "auto") {
    if (!base) fail("--base is required for --source auto");
    console.log(`Detecting platform at ${base} …`);
    if (await detectWooCommerce(base)) source = "woocommerce";
    else if (await detectShopify(base)) source = "shopify";
    else source = "sitemap";
    console.log(`  → ${source}`);
  }

  switch (source) {
    case "woocommerce": {
      if (!base) fail("--base is required");
      const lang = args["secondary-lang"];
      result = await importWooCommerce(base, {
        limit,
        primaryLang,
        secondaryLang: lang === "ar" || lang === "en" ? { lang, query: args["secondary-query"] ?? `lang=${lang}` } : undefined,
      });
      break;
    }
    case "shopify":
      if (!base) fail("--base is required");
      result = await importShopify(base, { limit, lang: primaryLang, currency: args.currency });
      break;
    case "sitemap":
      if (!base) fail("--base is required");
      result = await importSitemap(base, {
        limit,
        match: new RegExp(args.match!),
        concurrency: Math.max(1, Math.min(8, Number(args.concurrency))),
        followAlternates: !args["no-alternates"],
      });
      break;
    case "file":
      if (!args.file) fail("--file is required for --source file");
      result = await importFile(args.file, { baseUrl: base, defaultCurrency: args.currency });
      break;
    default:
      fail(`Unknown source "${source}". Use auto, woocommerce, shopify, sitemap or file.`);
  }

  const outDir = path.resolve(args.out!);
  const translations = await readJsonIfExists<Record<string, Localized>>(path.join(outDir, "category-translations.json"));
  if (translations) applyCategoryTranslations(result.categories, translations);

  const importedAt = new Date().toISOString();
  const { products, categories, redirects, meta, report } = normalize(result, importedAt);

  if (args["download-images"] && !args["dry-run"]) {
    console.log("Copying product images …");
    const { downloaded, failures } = await localizeImages(products, categories, path.resolve("public"));
    console.log(`  ${downloaded} images stored under public/catalog/images`);
    report.failures.push(...failures);
  }

  const summary = [
    `Source:        ${report.source}${report.baseUrl ? ` (${report.baseUrl})` : ""}`,
    `Products:      ${report.totals.products}`,
    `Categories:    ${report.totals.categories}`,
    `Redirects:     ${report.totals.redirects}`,
    `Duplicates:    ${report.duplicatesRemoved.length} removed (same source id, or same SKU + name)`,
    `SKU conflicts: ${report.skuConflicts.length} (same SKU, different names — kept, review manually)`,
    `Missing:       images ${report.missing.images.length} · SKU ${report.missing.sku.length} · category ${report.missing.category.length} · description ${report.missing.description.length}`,
    `               brand ${report.missing.brand} · public price ${report.missing.price} · Arabic name ${report.missing.arabicName} · English name ${report.missing.englishName}`,
    `Failures:      ${report.failures.length}`,
  ].join("\n");
  console.log(`\n${summary}\n`);

  if (args["dry-run"]) {
    console.log("Dry run: nothing written.");
    return;
  }
  if (products.length === 0) fail("No products were imported; existing catalog files were left unchanged.");

  await mkdir(outDir, { recursive: true });
  const write = (name: string, data: unknown) => writeFile(path.join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  await Promise.all([
    write("products.json", products),
    write("categories.json", categories),
    write("redirects.json", redirects),
    write("meta.json", meta),
    write("import-report.json", report),
  ]);
  console.log(`Wrote catalog to ${path.relative(process.cwd(), outDir) || "."}. Next: npm run catalog:validate`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
