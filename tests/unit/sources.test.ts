// Importer adapters against a local mock website (no external network).
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { normalize } from "../../scripts/catalog/normalize.ts";
import { importSitemap } from "../../scripts/catalog/sources/sitemap.ts";
import { detectWooCommerce, importWooCommerce } from "../../scripts/catalog/sources/woocommerce.ts";

let server: Server;
let base = "";

const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
function productPage(lang: "en" | "ar", alt: string) {
  const name = lang === "en" ? "Mock Breaker 3P" : "قاطع تجريبي ثلاثي";
  return `<!doctype html><html lang="${lang}"><head>
<link rel="alternate" hreflang="${lang === "en" ? "ar" : "en"}" href="${alt}">
${ld({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name,
      sku: "MOCK-3P",
      mpn: "MB-3P-63",
      brand: { "@type": "Brand", name: "MockBrand" },
      image: ["/img/b.jpg"],
      description: lang === "en" ? "<p>Three pole.</p>" : "<p>ثلاثي الأقطاب.</p>",
      additionalProperty: [{ "@type": "PropertyValue", name: lang === "en" ? "Poles" : "الأقطاب", value: "3" }],
      offers: { "@type": "Offer", price: "125.50", priceCurrency: "SAR" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "الرئيسية", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: lang === "en" ? "Breakers" : "القواطع", item: `${base}/${lang === "ar" ? "ar/" : ""}c/breakers` },
        { "@type": "ListItem", position: 3, name },
      ],
    },
  ],
})}</head><body>${name}</body></html>`;
}

before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url!, base);
    const send = (status: number, type: string, body: string, headers: Record<string, string> = {}) => {
      res.writeHead(status, { "content-type": type, ...headers }).end(body);
    };
    switch (url.pathname) {
      case "/robots.txt":
        return send(200, "text/plain", `User-agent: *\nDisallow: /product/private\nSitemap: ${base}/sitemap_index.xml\n`);
      case "/sitemap_index.xml":
        return send(200, "application/xml", `<sitemapindex><sitemap><loc>${base}/product-sitemap.xml</loc></sitemap></sitemapindex>`);
      case "/product-sitemap.xml":
        return send(
          200,
          "application/xml",
          `<urlset><url><loc>${base}/product/mock-breaker</loc></url><url><loc>${base}/product/private-item</loc></url><url><loc>${base}/about</loc></url></urlset>`,
        );
      case "/product/mock-breaker":
        return send(200, "text/html", productPage("en", `${base}/ar/product/mock-breaker-ar`));
      case "/ar/product/mock-breaker-ar":
        return send(200, "text/html", productPage("ar", `${base}/product/mock-breaker`));
      case "/wp-json/wc/store/v1/products/categories":
        return send(200, "application/json", JSON.stringify([{ id: 9, name: "Cables &amp; Wires", slug: "cables", parent: 0, permalink: `${base}/product-category/cables/` }]), { "x-wp-totalpages": "1" });
      case "/wp-json/wc/store/v1/products": {
        const ar = url.searchParams.get("lang") === "ar";
        const items = [
          {
            id: 101,
            name: ar ? "كابل نحاس" : "Copper Cable 4x16",
            slug: "copper-cable-4x16",
            permalink: `${base}/${ar ? "ar/" : ""}product/copper-cable-4x16/`,
            sku: "CC-416",
            short_description: "<p>Armoured</p>",
            description: "",
            prices: { price: "0", currency_code: "SAR", currency_minor_unit: 2 },
            images: [{ src: `${base}/img/c.jpg`, alt: "" }],
            categories: [{ id: 9, name: "Cables", slug: "cables" }],
            attributes: [{ id: 1, name: "Cores", taxonomy: "pa_cores", terms: [{ name: "4" }] }],
          },
          {
            id: 102,
            name: "Gland 20mm",
            slug: "gland-20mm",
            permalink: `${base}/product/gland-20mm/`,
            sku: "",
            prices: { price: "1250", currency_code: "SAR", currency_minor_unit: 2 },
            images: [],
            categories: [{ id: 9, name: "Cables", slug: "cables" }],
            attributes: [],
          },
        ];
        return send(200, "application/json", JSON.stringify(ar ? items.slice(0, 1) : items), { "x-wp-totalpages": "1" });
      }
      default:
        return send(404, "text/plain", "not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

describe("WooCommerce importer", () => {
  it("detects the Store API and imports products, categories and translations", async () => {
    assert.equal(await detectWooCommerce(base), true);
    const result = await importWooCommerce(base, { limit: 100, primaryLang: "en", secondaryLang: { lang: "ar", query: "lang=ar" } });
    const { products, categories, redirects } = normalize(result, new Date().toISOString());
    assert.equal(categories[0].name.en, "Cables & Wires");
    const cable = products.find((p) => p.sku === "CC-416")!;
    assert.deepEqual(cable.name, { en: "Copper Cable 4x16", ar: "كابل نحاس" });
    assert.equal(cable.price, undefined, "a zero price must not be published");
    assert.deepEqual(cable.attributes[0].values, ["4"]);
    const gland = products.find((p) => p.slug === "gland-20mm")!;
    assert.equal(gland.price?.amount, 12.5);
    assert.ok(redirects.some((r) => r.from === "/ar/product/copper-cable-4x16" && r.to === "/ar/products/copper-cable-4x16"));
    assert.ok(redirects.some((r) => r.from === "/product-category/cables" && r.to === "/en/categories/cables"));
  });
});

describe("sitemap importer", () => {
  it("reads JSON-LD, respects robots.txt and merges the hreflang alternate", async () => {
    const result = await importSitemap(base, { limit: 100, match: /\/product\//, concurrency: 2, followAlternates: true });
    assert.equal(result.products.length, 1, "robots-disallowed and non-product URLs are skipped");
    const { products, categories } = normalize(result, new Date().toISOString());
    const p = products[0];
    assert.deepEqual(p.name, { en: "Mock Breaker 3P", ar: "قاطع تجريبي ثلاثي" });
    assert.equal(p.sku, "MOCK-3P");
    assert.equal(p.partNumber, "MB-3P-63");
    assert.equal(p.brand, "MockBrand");
    assert.equal(p.price?.amount, 125.5);
    assert.equal(p.images[0].src, `${base}/img/b.jpg`);
    assert.deepEqual(p.attributes[0].label, { en: "Poles", ar: "الأقطاب" });
    assert.deepEqual(categories[0].name, { en: "Breakers", ar: "القواطع" });
  });
});
