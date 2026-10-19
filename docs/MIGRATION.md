# Catalog migration

The catalog lives in `data/catalog/` as JSON:

| File | Contents |
| --- | --- |
| `products.json` | Products (`src/lib/catalog/types.ts` → `Product`) |
| `categories.json` | Category tree |
| `redirects.json` | Old URL path → new URL (301), applied by `src/proxy.ts` |
| `meta.json` | Source, import time, counts |
| `import-report.json` | Missing data, duplicates, SKU conflicts, failures |
| `category-translations.json` | _Optional, hand-written._ Extra names per category slug, e.g. `{"cables": {"ar": "الكابلات"}}` |

Re-running the import replaces these files, so the process is repeatable. If an import finds no products, the existing files are left untouched.

## 1. Run the import

The website must be reachable from the machine running the import. In Claude Code cloud environments, add `almanfz.com` under **Network access → Allowed domains**. Node's `fetch` only uses an HTTP proxy when `NODE_USE_ENV_PROXY=1` is set.

```bash
# Detect the platform automatically (WooCommerce → Shopify → sitemap crawl)
npm run catalog:import -- --source auto --base https://almanfz.com --dry-run
npm run catalog:import -- --source auto --base https://almanfz.com --download-images
```

### Source options

| Source | When | Notes |
| --- | --- | --- |
| `woocommerce` | WordPress + WooCommerce | Uses the public Store API (`/wp-json/wc/store/v1`). For WPML/Polylang Arabic, add `--secondary-lang ar --secondary-query lang=ar`. Translations are merged **by SKU only** |
| `shopify` | Shopify | Uses `/products.json`. The feed has no currency, so prices are imported only with `--currency SAR` (after you confirm it) |
| `sitemap` | Anything else (Salla, Zid, Magento, custom) | Reads `robots.txt`/`sitemap.xml`, keeps URLs matching `--match` (default `/(product\|products\|p)/`), respects `Disallow`, and reads schema.org `Product` + `BreadcrumbList` JSON-LD. Follows `hreflang` links to merge the other language unless you pass `--no-alternates` |
| `file` | A spreadsheet or ERP export | `--file export.csv` or `.json`. Columns below |

Other flags: `--out <dir>`, `--limit <n>` (sample a few products first), `--primary-lang ar` (when the source's default language is Arabic), `--concurrency <n>` (default 3, polite), `--dry-run`, `--download-images`.

### CSV columns

Column names are case-insensitive. Only `name_en` or `name_ar` is required.

| Column | Meaning |
| --- | --- |
| `id` | Stable source id (falls back to `sku`, then the row number) |
| `name_en`, `name_ar` | Product names |
| `slug` | URL slug to keep (Arabic is allowed) |
| `sku`, `part_number` | Identifiers |
| `brand` | Manufacturer / brand |
| `category`, `category_ar` | Path such as `Electrical > Cables > Power Cables` |
| `price`, `currency`, `price_includes_vat` | Price is kept **only** if it is > 0 **and** has a currency (`--currency` sets a default) |
| `image_urls` | `\|`-separated absolute URLs |
| `summary_en`, `summary_ar`, `description_en`, `description_ar` | Text or HTML (HTML is converted to plain text) |
| `attr:<Label EN>\|<Label AR>` | One column per specification, e.g. `attr:Voltage\|الجهد`. Multiple values are `;`-separated |
| `url` | Old product URL, used to build a redirect |
| `featured` | `true` to show on the homepage |

## 2. Normalisation rules

The importer never changes facts. It only:

- trims whitespace and converts description HTML to paragraphs and bullet lists;
- removes **demonstrable** duplicates: the same source id, or the same SKU **and** the same name. The duplicate's old URL redirects to the product that was kept;
- **keeps** products that share a SKU but have different names, and lists them under `skuConflicts` for manual review;
- drops zero, negative or currency-less prices (the product shows "Request Price");
- makes slugs unique (`-2`, `-3`, …) while keeping the original slug where possible;
- drops categories that have no products in them or below them.

## 3. Validate

```bash
npm run catalog:validate                 # structure: ids, slugs, categories, prices, redirects
npm run catalog:validate -- --sample 25  # compare 25 random products with their live source pages
```

Review `data/catalog/import-report.json`:

- `missing.images`, `missing.sku`, `missing.category`, `missing.description`: product ids to fix at the source or in a CSV;
- `skuConflicts`: decide whether these are the same product;
- `failures`: pages that could not be fetched or had no structured data.

## 4. Publish

Commit `data/catalog/` (and `public/catalog/images/` if you used `--download-images`), then rebuild and deploy. The build pre-renders product pages and compiles `redirects.json` into the proxy, so **a rebuild is required after every import**. Product pages also revalidate hourly when the data directory changes on a long-running server.

## Images

Without `--download-images`, product images are loaded from the old host, which must stay listed in `CATALOG_IMAGE_HOSTS`. With the flag, Almanfz's own product photos are copied to `public/catalog/images/`. Only JPEG, PNG, WebP, GIF and AVIF up to 15 MB are accepted, so the new site no longer depends on the old server. Copy only images Almanfz has the right to use; manufacturer photos may carry their own licence terms.
