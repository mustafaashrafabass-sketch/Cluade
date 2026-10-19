import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { fillContact, watchConsole } from "./helpers";

test("BOQ upload is validated and recorded", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/en/rfq");
  const upload = page.getByLabel("BOQ or product list");

  await upload.setInputFiles({ name: "malware.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
  await expect(page.getByText("Upload a PDF, XLSX, XLS or CSV file.")).toBeVisible();

  await upload.setInputFiles({ name: "boq.csv", mimeType: "text/csv", buffer: Buffer.from("item,qty\nFIX-0001,10\n") });
  await expect(page.getByText("boq.csv")).toBeVisible();
  await fillContact(page);
  await page.getByLabel(/Requirements/).fill("Please quote the attached list.");
  await page.getByRole("button", { name: "Submit BOQ" }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Request received");
  const reference = (await status.textContent())!.match(/AMZ-B-\d{8}-[0-9A-F]{6}/)![0];

  const lead = JSON.parse(await readFile(path.resolve(".data/e2e-leads", `${reference}.json`), "utf8"));
  expect(lead.type).toBe("rfq");
  expect(lead.attachment).toMatchObject({ filename: "boq.csv", contentType: "text/csv" });
  const stored = await readFile(path.resolve(".data/e2e-leads", lead.attachment.storedAs), "utf8");
  expect(stored).toContain("FIX-0001,10");
  consoleWatch.assertClean();
});

test("server rejects a file whose content does not match its extension", async ({ page }) => {
  await page.goto("/en/rfq");
  await page.getByLabel("BOQ or product list").setInputFiles({ name: "boq.pdf", mimeType: "application/pdf", buffer: Buffer.from("not really a pdf") });
  await fillContact(page);
  await page.getByRole("button", { name: "Submit BOQ" }).click();
  await expect(page.getByRole("alert").first()).toContainText("Please correct the highlighted fields.");
  await expect(page.getByText("The file content doesn’t match its type.")).toBeVisible();
});

test("contact form submits and shows a reference", async ({ page }) => {
  await page.goto("/en/contact");
  await page.getByLabel(/Full name/).fill("Test Buyer");
  await page.getByLabel(/Business email/).fill("buyer@example.com");
  await page.getByLabel(/^Message/).fill("Do you supply cable trays?");
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText(/AMZ-C-\d{8}-[0-9A-F]{6}/);
});
