import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv, csvToObjects } from "../../scripts/catalog/csv.ts";
import { extractJsonLd, htmlToText } from "../../scripts/catalog/html.ts";
import { legacyPath, normalize, type RawProduct } from "../../scripts/catalog/normalize.ts";
import { normalizeForSearch, slugify } from "../../src/lib/catalog/text.ts";

const raw = (over: Partial<RawProduct>): RawProduct => ({
  sourceId: "1",
  name: { en: "Cable" },
  categorySourceIds: [],
  images: [],
  attributes: [],
  ...over,
});

describe("text helpers", () => {
  it("normalises Arabic and punctuation for search", () => {
    assert.equal(normalizeForSearch("كابلات الألمنيوم"), "كابلات الالمنيوم");
    assert.equal(normalizeForSearch("NYY-4×16 mm²"), "nyy 4x16 mm2");
    assert.equal(normalizeForSearch("4 × 16"), "4x16");
    assert.equal(normalizeForSearch("١٢٣"), "123");
  });
  it("keeps Arabic slugs", () => {
    assert.equal(slugify("قاطع كهربائي 3 فاز"), "قاطع-كهربائي-3-فاز");
    assert.equal(slugify("  MCCB / 630A  "), "mccb-630a");
  });
});

describe("html conversion", () => {
  it("turns HTML into paragraphs and bullet lists", () => {
    const text = htmlToText("<p>Intro &amp; more</p><ul><li>One</li><li>Two</li></ul><p>End<br>line</p><script>x()</script>");
    assert.equal(text, "Intro & more\n\n• One\n• Two\n\nEnd\nline");
  });
  it("flattens JSON-LD @graph", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"A"},{"@type":"BreadcrumbList"}]}</script>`;
    assert.deepEqual(extractJsonLd(html).map((o) => o["@type"]), ["Product", "BreadcrumbList"]);
  });
});

describe("csv", () => {
  it("handles quotes, escaped quotes and newlines", () => {
    assert.deepEqual(parseCsv('a,b\n"x, y","he said ""hi""\nok"\n'), [["a", "b"], ["x, y", 'he said "hi"\nok']]);
  });
  it("detects semicolon delimiters and strips BOM", () => {
    assert.deepEqual(csvToObjects("\uFEFFsku;name\nA1;Cable"), [{ sku: "A1", name: "Cable" }]);
  });
});

describe("normalize", () => {
  const at = "2026-01-01T00:00:00.000Z";

  it("drops zero/invalid prices instead of showing them", () => {
    const { products, report } = normalize(
      { system: "t", baseUrl: null, categories: [], failures: [], products: [raw({ price: { amount: 0, currency: "SAR" } })] },
      at,
    );
    assert.equal(products[0].price, undefined);
    assert.equal(report.invalidPrices.length, 1);
  });

  it("removes only demonstrable duplicates and redirects their URLs", () => {
    const { products, redirects, report } = normalize(
      {
        system: "t",
        baseUrl: "https://old.test",
        categories: [],
        failures: [],
        products: [
          raw({ sourceId: "1", sku: "A1", url: "https://old.test/product/cable/" }),
          raw({ sourceId: "2", sku: "A1", url: "https://old.test/product/cable-copy/" }),
          raw({ sourceId: "3", sku: "A1", name: { en: "Cable armoured" } }),
        ],
      },
      at,
    );
    assert.equal(products.length, 2);
    assert.equal(report.duplicatesRemoved.length, 1);
    assert.deepEqual(report.skuConflicts, [{ sku: "a1", productIds: ["t-1", "t-3"] }]);
    assert.ok(redirects.some((r) => r.from === "/product/cable-copy" && r.to === "/en/products/cable"));
  });

  it("makes slugs unique and maps Arabic legacy URLs to the Arabic site", () => {
    const { products, redirects } = normalize(
      {
        system: "t",
        baseUrl: "https://old.test",
        categories: [],
        failures: [],
        products: [
          raw({ sourceId: "1", slug: "cable" }),
          raw({ sourceId: "2", slug: "cable", name: { en: "Other" }, url: "https://old.test/ar/product/%D9%83%D8%A7%D8%A8%D9%84/" }),
        ],
      },
      at,
    );
    assert.deepEqual(products.map((p) => p.slug), ["cable", "cable-2"]);
    assert.deepEqual(redirects, [{ from: "/ar/product/كابل", to: "/ar/products/cable-2" }]);
  });

  it("decodes legacy paths and strips trailing slashes", () => {
    assert.equal(legacyPath("https://x.test/product/%D9%83%D8%A7%D8%A8%D9%84/", null), "/product/كابل");
    assert.equal(legacyPath("https://x.test/", null), undefined);
  });
});
