import { expect, test } from "@playwright/test";
import { watchConsole } from "./helpers";

test("root redirects to English and the homepage renders", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your Project. Every Essential.");
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Have a BOQ? Let’s Source It." })).toBeVisible();
  await expect(page).toHaveTitle(/Almanfz/);
  consoleWatch.assertClean();
});

test("language switcher keeps the page and switches to RTL Arabic", async ({ page }) => {
  await page.goto("/en/products?q=FIX-0003");
  await page.getByRole("link", { name: "تغيير اللغة إلى العربية" }).first().click();
  await expect(page).toHaveURL(/\/ar\/products\?q=FIX-0003/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar-SA");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("المنتجات");
  await expect(page.getByRole("link", { name: "منتج اختبار 003" })).toBeVisible();
  // Choice is remembered for unprefixed URLs.
  await page.goto("/products");
  await expect(page).toHaveURL(/\/ar\/products$/);
});

test("catalog search, filter, sort and pagination", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/en/products");
  await expect(page.getByRole("heading", { name: /31 products/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search products" }).last().fill("fix 0012");
  await page.getByRole("searchbox", { name: "Search products" }).last().press("Enter");
  await expect(page).toHaveURL(/q=fix\+0012/);
  await expect(page.locator("article").first()).toContainText("TEST Fixture Product 012");

  await page.goto("/en/products");
  await page.getByRole("checkbox", { name: /Fixture Brand B/ }).check();
  await expect(page).toHaveURL(/brand=Fixture\+Brand\+B/);
  await expect(page.getByRole("heading", { name: /\d+ products/ })).toHaveText(/1[0-9] products/);
  const brands = await page.locator("article").allTextContents();
  expect(brands.every((t) => t.includes("Fixture Brand B"))).toBe(true);

  await page.getByRole("combobox", { name: "Sort by" }).selectOption("price-desc");
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect(page.locator("article").first()).toContainText("SAR");

  await page.goto("/en/products?q=nothing-matches-this");
  await expect(page.getByRole("heading", { name: "No products match your search" })).toBeVisible();

  await page.goto("/en/products?page=2");
  await expect(page.locator("article")).toHaveCount(7);
  consoleWatch.assertClean();
});

test("category pages list only their products", async ({ page }) => {
  await page.goto("/en/categories");
  await page.getByRole("link", { name: /Test Category Beta/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Category Beta");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Categories");
  // 10 Beta fixtures plus the SKU-conflict fixture that shares row 2's category.
  await expect(page.getByRole("heading", { name: /^11 products/ })).toBeVisible();
});

test("product page shows verified details, structured data and related items", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/en/products/test-fixture-product-010");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TEST Fixture Product 010");
  await expect(page.getByText("FIX-0010", { exact: true })).toBeVisible();
  await expect(page.getByText("SAR 105.00").or(page.getByText("SAR 105.00", { exact: false }))).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Test Rating");
  await expect(page.getByRole("heading", { name: "Related products" })).toBeVisible();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = ld.map((s) => JSON.parse(s)).find((o) => o["@type"] === "Product");
  expect(product.sku).toBe("FIX-0010");
  expect(product.offers.price).toBe("105.00");
  expect(product.offers.availability).toBeUndefined();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/products\/test-fixture-product-010$/);
  await expect(page.locator('link[rel="alternate"][hreflang="ar-SA"]')).toHaveAttribute("href", /\/ar\/products\/test-fixture-product-010$/);
  consoleWatch.assertClean();

  // Unpriced products never show a zero price.
  await page.goto("/en/products/test-fixture-product-011");
  await expect(page.getByText("Request Price").first()).toBeVisible();
  await expect(page.getByText("SAR 0")).toHaveCount(0);
});

test("unknown pages return a localised 404", async ({ page }) => {
  const res = await page.goto("/ar/products/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
  const res2 = await page.goto("/en/some/unknown/path");
  expect(res2?.status()).toBe(404);
});

test("sitemap and robots expose catalog URLs", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/en/products/test-fixture-product-001");
  expect(sitemap).toContain("/ar/categories/test-category-beta");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap:");
  expect(robots).toContain("Disallow: /api/");
});

test("API rejects cross-site and invalid submissions", async ({ request }) => {
  const crossSite = await request.post("/api/contact", { headers: { origin: "https://evil.example" }, multipart: { fullName: "x" } });
  expect(crossSite.status()).toBe(403);
  const invalid = await request.post("/api/contact", {
    headers: { origin: "http://localhost:3100" },
    multipart: { fullName: "", email: "not-an-email", message: "", locale: "en" },
  });
  expect(invalid.status()).toBe(422);
  const body = await invalid.json();
  expect(body.fields).toMatchObject({ fullName: "required", email: "email", message: "required", consent: "consent" });
});
