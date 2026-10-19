import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildIndex, parseCatalogSearchParams, queryCatalog, relatedProducts } from "../../src/lib/catalog/query.ts";
import type { Category, Product } from "../../src/lib/catalog/types.ts";

const products = JSON.parse(readFileSync("tests/fixtures/catalog/products.json", "utf8")) as Product[];
const categories = JSON.parse(readFileSync("tests/fixtures/catalog/categories.json", "utf8")) as Category[];
const index = buildIndex(products, categories);

describe("catalog search", () => {
  it("finds a product by exact SKU regardless of punctuation and case", () => {
    const r = queryCatalog(index, { q: "fix 0007" }, "en");
    assert.equal(r.items[0]?.sku, "FIX-0007");
  });

  it("finds products by part number", () => {
    const r = queryCatalog(index, { q: "FX-PN-0008" }, "en");
    assert.equal(r.items[0]?.sku, "FIX-0008");
  });

  it("matches Arabic names with normalised letters", () => {
    const r = queryCatalog(index, { q: "منتج إختبار 012" }, "ar");
    assert.equal(r.items[0]?.sku, "FIX-0012");
  });

  it("requires every term to match", () => {
    assert.equal(queryCatalog(index, { q: "fixture zzzz-no-match" }, "en").total, 0);
  });

  it("filters by category including subcategories", () => {
    const parent = categories.find((c) => !c.parentId && c.slug === "test-category-alpha")!;
    const r = queryCatalog(index, { category: parent.slug, pageSize: 96 }, "en");
    const allowed = new Set(categories.filter((c) => c.parentId === parent.id).map((c) => c.id));
    assert.ok(r.total > 0);
    assert.ok(r.items.every((p) => p.categoryIds.some((id) => allowed.has(id))));
  });

  it("returns nothing for an unknown category instead of everything", () => {
    assert.equal(queryCatalog(index, { category: "does-not-exist" }, "en").total, 0);
  });

  it("filters by brand and attribute, and reports facets", () => {
    const r = queryCatalog(index, { brands: ["Fixture Brand A"], attributes: { "test-rating": ["16A"] } }, "en");
    assert.equal(r.total, 0, "brand A only has 10A in fixtures");
    const r2 = queryCatalog(index, { brands: ["Fixture Brand B"], attributes: { "test-rating": ["16A"] }, pageSize: 96 }, "en");
    assert.ok(r2.total > 0);
    assert.ok(r2.items.every((p) => p.brand === "Fixture Brand B"));
    const r3 = queryCatalog(index, { brands: ["Fixture Brand B"] }, "en");
    assert.ok(r3.brands.some((b) => b.value === "Fixture Brand A"), "brand facet ignores its own filter");
  });

  it("sorts by price with unpriced products last", () => {
    const r = queryCatalog(index, { sort: "price-desc", pageSize: 96 }, "en");
    const priced = r.items.filter((p) => p.price);
    assert.ok(priced.length > 1);
    assert.deepEqual(r.items.slice(0, priced.length), priced);
    for (let i = 1; i < priced.length; i++) assert.ok(priced[i - 1].price!.amount >= priced[i].price!.amount);
  });

  it("paginates and clamps out-of-range pages", () => {
    const r = queryCatalog(index, { page: 99, pageSize: 24 }, "en");
    assert.equal(r.pageCount, 2);
    assert.equal(r.page, 2);
    assert.equal(r.items.length, products.length - 24);
  });

  it("parses and sanitises URL search params", () => {
    const q = parseCatalogSearchParams({ q: "x".repeat(500), sort: "evil", brand: ["A", "B"], "attr.test-rating": "10A", page: "abc" });
    assert.equal(q.q?.length, 120);
    assert.equal(q.sort, undefined);
    assert.deepEqual(q.brands, ["A", "B"]);
    assert.deepEqual(q.attributes, { "test-rating": ["10A"] });
    assert.equal(q.page, 1);
  });

  it("suggests related products from the same category only", () => {
    const p = products[0];
    const related = relatedProducts(index, p, 4);
    assert.ok(related.length > 0);
    assert.ok(related.every((r) => r.id !== p.id && r.categoryIds.some((id) => p.categoryIds.includes(id))));
  });
});
