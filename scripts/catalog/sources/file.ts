// CSV / JSON export importer. Column reference: docs/MIGRATION.md#csv-columns
import { readFile } from "node:fs/promises";
import { csvToObjects } from "../csv.ts";
import { htmlToText } from "../html.ts";
import { slugify } from "../../../src/lib/catalog/text.ts";
import type { RawCategory, RawProduct, SourceResult } from "../normalize.ts";

type Row = Record<string, string>;

function get(row: Row, ...names: string[]): string | undefined {
  for (const n of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase() === n.toLowerCase());
    const v = key ? row[key]?.trim() : undefined;
    if (v) return v;
  }
  return undefined;
}

const truthy = (v: string | undefined) => (v ? /^(1|true|yes|y|نعم)$/i.test(v) : undefined);

export async function importFile(path: string, opts: { baseUrl: string | null; defaultCurrency?: string }): Promise<SourceResult> {
  const text = await readFile(path, "utf8");
  const rows: Row[] = path.toLowerCase().endsWith(".json")
    ? (JSON.parse(text) as Record<string, unknown>[]).map((o) =>
        Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? "" : String(v)])),
      )
    : csvToObjects(text);

  const failures: SourceResult["failures"] = [];
  const categories = new Map<string, RawCategory>();

  // "Electrical > Cables > Power Cables" builds a hierarchy; *_ar columns give the Arabic path.
  function categoryPath(en: string | undefined, ar: string | undefined): string | undefined {
    const enParts = en?.split(/\s*>\s*/).filter(Boolean) ?? [];
    const arParts = ar?.split(/\s*>\s*/).filter(Boolean) ?? [];
    const depth = Math.max(enParts.length, arParts.length);
    let parent: string | undefined;
    for (let i = 0; i < depth; i++) {
      const id = `${parent ? `${parent}/` : ""}${slugify(enParts[i] ?? arParts[i])}`;
      const existing = categories.get(id);
      if (!existing) {
        categories.set(id, {
          sourceId: id,
          name: { en: enParts[i], ar: arParts[i] },
          slug: slugify(enParts[i] ?? arParts[i]),
          parentSourceId: parent,
          order: categories.size,
        });
      } else {
        existing.name = { en: existing.name.en ?? enParts[i], ar: existing.name.ar ?? arParts[i] };
      }
      parent = id;
    }
    return parent;
  }

  const products: RawProduct[] = rows.map((row, i) => {
    const priceRaw = get(row, "price", "sale_price", "regular_price");
    const currency = get(row, "currency") ?? opts.defaultCurrency;
    const amount = priceRaw ? Number(priceRaw.replace(/[^\d.]/g, "")) : NaN;
    if (priceRaw && !currency) failures.push({ url: `row ${i + 2}`, reason: "price without currency was skipped" });
    const cat = categoryPath(get(row, "category", "category_en", "categories"), get(row, "category_ar"));
    const attributes = Object.entries(row)
      .filter(([k, v]) => /^(attr|spec)[:.]/i.test(k) && v)
      .map(([k, v]) => {
        const [labelEn, labelAr] = k.replace(/^(attr|spec)[:.]/i, "").split("|").map((s) => s.trim());
        return { key: slugify(labelEn || labelAr), label: { en: labelEn || undefined, ar: labelAr || undefined }, values: v.split(/\s*;\s*/) };
      });
    const imageField = get(row, "image_urls", "images", "image", "image_url") ?? "";
    return {
      sourceId: get(row, "id", "product_id", "sku") ?? `row-${i + 2}`,
      name: { en: get(row, "name_en", "name", "title"), ar: get(row, "name_ar", "title_ar") },
      slug: get(row, "slug", "handle"),
      sku: get(row, "sku", "model", "item_code"),
      partNumber: get(row, "part_number", "mpn", "manufacturer_part_number"),
      brand: get(row, "brand", "manufacturer", "vendor"),
      categorySourceIds: cat ? [cat] : [],
      summary: { en: htmlToText(get(row, "summary_en", "short_description")), ar: htmlToText(get(row, "summary_ar")) },
      description: { en: htmlToText(get(row, "description_en", "description")), ar: htmlToText(get(row, "description_ar")) },
      images: imageField
        .split(/\s*[|,\n]\s*/)
        .filter((s) => /^(https?:\/\/|\/)/.test(s))
        .map((src) => ({ src })),
      attributes,
      price: priceRaw && currency && Number.isFinite(amount) ? { amount, currency, includesVat: truthy(get(row, "price_includes_vat")) } : undefined,
      url: get(row, "url", "permalink", "old_url"),
      featured: truthy(get(row, "featured")),
    };
  });

  return { system: "file", baseUrl: opts.baseUrl, categories: [...categories.values()], products, failures };
}
