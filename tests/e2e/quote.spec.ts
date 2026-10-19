import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { fillContact, watchConsole } from "./helpers";

const LEADS = path.resolve(".data/e2e-leads");

async function readLead(reference: string) {
  const files = await readdir(LEADS);
  expect(files).toContain(`${reference}.json`);
  return JSON.parse(await readFile(path.join(LEADS, `${reference}.json`), "utf8"));
}

test("build a quote list, edit it and submit it", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/en/products/test-fixture-product-004");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  // The first "Add to Quote" is the product panel; related-product cards follow it.
  await page.getByRole("button", { name: "Add to Quote" }).first().click();
  await expect(page.getByText("In quote list (3)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Quote list, 1 items" })).toBeVisible();

  // Second product from a card in the catalog.
  await page.goto("/en/products?q=FIX-0007");
  await page.locator("article").first().getByRole("button", { name: "Add to Quote" }).click();
  await expect(page.getByRole("link", { name: "Quote list, 2 items" })).toBeVisible();

  // The list survives navigation and reloads.
  await page.goto("/en/quote");
  await page.reload();
  const items = page.getByRole("list").filter({ has: page.getByText("TEST Fixture Product 004") });
  await expect(items.getByRole("listitem")).toHaveCount(2);

  const qty = page.getByRole("textbox", { name: "Quantity for TEST Fixture Product 004" });
  await expect(qty).toHaveValue("3");
  await qty.fill("12");
  await page.getByPlaceholder(/Note for this item/).first().fill("Prefer brand A");
  await page.getByRole("button", { name: "Remove TEST Fixture Product 007 from quote list" }).click();
  await expect(items.getByRole("listitem")).toHaveCount(1);

  await fillContact(page);
  await page.getByLabel(/Project name/).fill("Test Tower");
  await page.getByLabel(/Additional notes/).fill("Deliver to site gate 3");
  await page.getByRole("button", { name: "Submit quotation request" }).click();

  const success = page.getByRole("status");
  await expect(success).toContainText("Request received");
  const reference = (await success.textContent())!.match(/AMZ-Q-\d{8}-[0-9A-F]{6}/)![0];

  const lead = await readLead(reference);
  expect(lead.type).toBe("quote");
  expect(lead.contact).toMatchObject({ fullName: "Test Buyer", company: "Test Contracting Co", city: "Riyadh" });
  expect(lead.items).toEqual([
    expect.objectContaining({ productId: "file-fx004", name: "TEST Fixture Product 004", sku: "FIX-0004", quantity: 12, note: "Prefer brand A", inCatalog: true }),
  ]);
  expect(lead.notes).toBe("Deliver to site gate 3");

  // The list is cleared after a recorded submission.
  await page.goto("/en/quote");
  await expect(page.getByRole("heading", { name: "Your quote list is empty" })).toBeVisible();
  consoleWatch.assertClean();
});

test("quote list works in Arabic with RTL layout", async ({ page }) => {
  await page.goto("/ar/products/test-fixture-product-002");
  await page.getByRole("button", { name: "أضف إلى عرض السعر" }).first().click();
  await expect(page.getByRole("link", { name: "قائمة عرض السعر، 1 عناصر" })).toBeVisible();
  await page.goto("/ar/quote");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("link", { name: "منتج اختبار 002" })).toBeVisible();
  // SKUs stay left-to-right inside Arabic text.
  await expect(page.getByText("FIX-0002")).toHaveCSS("direction", "ltr");
});
