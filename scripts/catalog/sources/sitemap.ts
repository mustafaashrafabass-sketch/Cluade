// Generic crawler: sitemap.xml → product pages → schema.org Product JSON-LD.
// Works for most platforms (Salla, Zid, Magento, OpenCart, custom builds) that
// publish structured data for search engines.
import { fetchText, mapLimit, robotsAllows } from "../http.ts";
import { decodeEntities, extractJsonLd, extractMeta, hasType, htmlToText, stripTags } from "../html.ts";
import { slugify } from "../../../src/lib/catalog/text.ts";
import type { RawCategory, RawProduct, SourceResult } from "../normalize.ts";

type Obj = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);

async function collectSitemapUrls(base: string, start: string[], max: number): Promise<string[]> {
  const queue = [...start];
  const seen = new Set<string>();
  const pages: string[] = [];
  while (queue.length && pages.length < max) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const { text } = await fetchText(url).catch(() => ({ text: null }));
    if (!text) continue;
    const locs = [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1]));
    if (/<sitemapindex/i.test(text)) queue.push(...locs);
    else pages.push(...locs);
  }
  return [...new Set(pages)].filter((u) => u.startsWith(base)).slice(0, max);
}

async function sitemapStarts(base: string): Promise<string[]> {
  const { text } = await fetchText(`${base}/robots.txt`).catch(() => ({ text: null }));
  const fromRobots = [...(text ?? "").matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  return fromRobots.length ? fromRobots : [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];
}

function images(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(images);
  if (typeof v === "object") return images((v as Obj).url ?? (v as Obj).contentUrl);
  return [];
}

function offerPrice(offers: unknown): { amount: number; currency: string; includesVat?: boolean } | undefined {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const o of list as Obj[]) {
    const spec = (Array.isArray(o.priceSpecification) ? o.priceSpecification[0] : o.priceSpecification) as Obj | undefined;
    let raw = str(o.price) ?? str(spec?.price);
    if (!raw && hasType(o, "AggregateOffer") && str(o.lowPrice) && str(o.lowPrice) === str(o.highPrice)) raw = str(o.lowPrice);
    const currency = str(o.priceCurrency) ?? str(spec?.priceCurrency);
    const amount = raw ? Number(raw.replace(/[^\d.]/g, "")) : NaN;
    // A price is only kept when the page states both amount and currency.
    if (currency && Number.isFinite(amount)) {
      const vat = spec?.valueAddedTaxIncluded;
      return { amount, currency, includesVat: typeof vat === "boolean" ? vat : vat === "true" ? true : vat === "false" ? false : undefined };
    }
  }
  return undefined;
}

function validProps(product: Obj): Obj[] {
  const list = (Array.isArray(product.additionalProperty) ? product.additionalProperty : []) as Obj[];
  return list.filter((a) => str(a.name) && a.value !== undefined);
}

interface PageData {
  lang: "en" | "ar";
  product: Obj;
  breadcrumbs: { name: string; url?: string }[];
  meta: Record<string, string>;
  alternates: Record<string, string>;
}

function parsePage(html: string): PageData | null {
  const ld = extractJsonLd(html);
  const product = ld.find((o) => hasType(o, "Product") || hasType(o, "ProductGroup"));
  if (!product) return null;
  const meta = extractMeta(html);
  const crumbsLd = ld.find((o) => hasType(o, "BreadcrumbList"));
  const breadcrumbs = ((crumbsLd?.itemListElement as Obj[] | undefined) ?? [])
    .slice()
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((li) => {
      const item = li.item as Obj | string | undefined;
      return {
        name: stripTags(str(li.name) ?? (typeof item === "object" ? str(item.name) : undefined) ?? ""),
        url: typeof item === "string" ? item : str(item?.["@id"]) ?? str(item?.url),
      };
    })
    .filter((c) => c.name);
  const alternates: Record<string, string> = {};
  for (const m of html.matchAll(/<link[^>]+rel=["']alternate["'][^>]*>/gi)) {
    const lang = m[0].match(/hreflang=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (lang && href) alternates[lang.slice(0, 2)] = decodeEntities(href);
  }
  const lang = (meta.lang ?? "en").startsWith("ar") ? "ar" : "en";
  return { lang, product, breadcrumbs, meta, alternates };
}

export async function importSitemap(
  base: string,
  opts: { limit: number; match: RegExp; concurrency: number; followAlternates: boolean },
): Promise<SourceResult> {
  const allowed = await robotsAllows(base);
  const urls = (await collectSitemapUrls(base, await sitemapStarts(base), 50_000))
    .filter((u) => opts.match.test(u))
    .filter((u) => allowed(new URL(u).pathname))
    .slice(0, opts.limit);
  console.log(`  ${urls.length} candidate product URLs from sitemap`);

  const failures: SourceResult["failures"] = [];
  const categories = new Map<string, RawCategory>();
  const seenPages = new Set<string>();

  const pages = await mapLimit(urls, opts.concurrency, async (url, i) => {
    if (i % 50 === 0) console.log(`  fetching ${i + 1}/${urls.length}`);
    try {
      const { status, text, url: finalUrl } = await fetchText(url);
      if (!text) {
        failures.push({ url, reason: `HTTP ${status}` });
        return null;
      }
      const page = parsePage(text);
      if (!page) {
        failures.push({ url, reason: "no schema.org Product data on page" });
        return null;
      }
      return { url: finalUrl, page };
    } catch (error) {
      failures.push({ url, reason: (error as Error).message });
      return null;
    }
  });

  const products: RawProduct[] = [];
  for (const entry of pages) {
    if (!entry || seenPages.has(entry.url)) continue;
    seenPages.add(entry.url);
    const { page, url } = entry;
    const p = page.product;
    const lang = page.lang;
    const name = stripTags(str(p.name) ?? page.meta["og:title"] ?? "");

    // Category path from breadcrumbs: drop "Home" (first) and the product itself (last).
    const trail = page.breadcrumbs.slice(1, page.breadcrumbs.at(-1)?.name === name ? -1 : undefined);
    let parent: string | undefined;
    const categoryIds: string[] = [];
    for (const [depth, crumb] of trail.entries()) {
      const id = crumb.url ?? `${parent ?? ""}/${slugify(crumb.name)}`;
      if (!categories.has(id)) {
        let slug: string | undefined;
        try {
          slug = crumb.url ? decodeURIComponent(new URL(crumb.url, base).pathname).split("/").filter(Boolean).pop() : undefined;
        } catch {
          slug = undefined;
        }
        categories.set(id, { sourceId: id, name: { [lang]: crumb.name }, slug, parentSourceId: parent, url: crumb.url, order: categories.size });
      }
      parent = id;
      if (depth === trail.length - 1) categoryIds.push(id);
    }
    if (!categoryIds.length && str(p.category)) {
      const catName = str(p.category)!.split(/\s*[>/]\s*/).pop()!;
      const id = `category/${slugify(catName)}`;
      if (!categories.has(id)) categories.set(id, { sourceId: id, name: { [lang]: catName }, order: categories.size });
      categoryIds.push(id);
    }

    const brand = typeof p.brand === "object" && p.brand ? str((p.brand as Obj).name) : str(p.brand);
    const props = validProps(p);
    let slug: string | undefined;
    try {
      slug = decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean).pop();
    } catch {
      slug = undefined;
    }

    const raw: RawProduct = {
      sourceId: str(p.productID) ?? str(p["@id"]) ?? url,
      name: { [lang]: name },
      slug,
      sku: str(p.sku),
      partNumber: str(p.mpn) && str(p.mpn) !== str(p.sku) ? str(p.mpn) : undefined,
      brand: brand ? stripTags(brand) : undefined,
      categorySourceIds: categoryIds,
      description: { [lang]: htmlToText(str(p.description) ?? page.meta["og:description"] ?? "") },
      images: images(p.image).map((src) => ({ src: new URL(src, url).toString() })),
      attributes: props.map((a) => ({ key: slugify(str(a.name)!), label: { [lang]: str(a.name)! }, values: [stripTags(str(a.value) ?? "")] })),
      price: offerPrice(p.offers),
      url,
    };

    // Merge the other language version of the same page when the site links it via hreflang.
    const otherLang = lang === "ar" ? "en" : "ar";
    const alt = page.alternates[otherLang];
    if (opts.followAlternates && alt && alt !== url) {
      try {
        const { text } = await fetchText(alt);
        const other = text ? parsePage(text) : null;
        if (other) {
          seenPages.add(alt);
          raw.name[otherLang] = stripTags(str(other.product.name) ?? "");
          raw.description = { ...raw.description, [otherLang]: htmlToText(str(other.product.description) ?? "") };
          raw.extraUrls = [alt];
          const otherTrail = other.breadcrumbs.slice(1, -1);
          trail.forEach((crumb, i) => {
            const id = crumb.url ?? "";
            const c = categories.get(id);
            if (c && otherTrail[i]?.name) c.name[otherLang] = otherTrail[i].name;
          });
          // Same product page in another language lists the same properties in the same order.
          const otherProps = validProps(other.product);
          if (otherProps.length === raw.attributes.length) {
            raw.attributes.forEach((attr, i) => (attr.label[otherLang] = str(otherProps[i].name)));
          }
        }
      } catch (error) {
        failures.push({ url: alt, reason: `alternate language: ${(error as Error).message}` });
      }
    }
    products.push(raw);
  }

  return { system: "site", baseUrl: base, categories: [...categories.values()], products, failures };
}
