import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run against a production build that uses the synthetic
 * fixture catalog (tests/fixtures/catalog) and the local file lead store.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } }, testMatch: /responsive|quote/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      CATALOG_DATA_DIR: "tests/fixtures/catalog",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      LEAD_DESTINATIONS: "file",
      LEAD_FILE_DIR: ".data/e2e-leads",
      LEAD_FILE_STORE_ALLOW_PRODUCTION: "true",
      CATALOG_IMAGE_HOSTS: "legacy.example.test",
    },
  },
});
