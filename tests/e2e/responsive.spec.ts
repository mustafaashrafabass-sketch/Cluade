import { expect, test } from "@playwright/test";
import { watchConsole } from "./helpers";

const pages = ["/en", "/ar", "/en/products", "/ar/products", "/en/products/test-fixture-product-001", "/en/quote", "/ar/rfq", "/en/contact", "/en/about"];

for (const url of pages) {
  test(`no horizontal overflow on ${url}`, async ({ page }) => {
    const consoleWatch = watchConsole(page);
    await page.goto(url);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    consoleWatch.assertClean();
  });
}

test("mobile menu is an accessible dialog", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/en");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Main navigation" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Products" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Open menu" }).click();
  await dialog.getByRole("link", { name: "About Us" }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(dialog).toBeHidden();
});

test("mobile filters are collapsible", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/en/products");
  const brand = page.getByRole("checkbox", { name: /Fixture Brand A/ });
  await expect(brand).toBeHidden();
  await page.getByRole("button", { name: "Show filters" }).click();
  await expect(brand).toBeVisible();
});

test("keyboard users can skip to content", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "keyboard check on desktop");
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});
