import { expect, type Page } from "@playwright/test";

/** Fail the test on any console error or uncaught exception. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(msg.text());
  });
  page.on("pageerror", (err) => problems.push(err.message));
  return {
    assertClean: () => expect(problems, problems.join("\n")).toEqual([]),
  };
}

export async function fillContact(page: Page) {
  await page.getByLabel(/Full name/).fill("Test Buyer");
  await page.getByLabel(/Company name/).fill("Test Contracting Co");
  await page.getByLabel(/Business email/).fill("buyer@example.com");
  await page.getByLabel(/Phone number/).fill("+966 50 000 0000");
  await page.getByLabel(/^City/).fill("Riyadh");
  await page.getByRole("checkbox", { name: /I agree/ }).check();
}
