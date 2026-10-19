# Phase 1 audit: almanfz.com and this repository

_Audit date: 2026-10-19_

## 1. Access to the existing website

The audit could not reach the live site from the build environment.

| Check | Result |
| --- | --- |
| `https://almanfz.com/` and `https://www.almanfz.com/` | Blocked: the build container's network policy denies the host (HTTP 403 at the egress proxy) |
| DNS lookup of `almanfz.com` from the fetch service | `ENOTFOUND` |
| Web Archive (`web.archive.org`) snapshots | Blocked by the same network policy |
| Web search for "almanfz", the domain, and Arabic name variants | No indexed pages for the site |

As a result, **nothing was copied from the existing site**: no product names, SKUs, categories, specifications, images, prices, logo, colours, contact details or SEO metadata. No platform (WordPress/WooCommerce, Shopify, Salla, Zid, custom) could be identified.

Following the brief, no catalog was invented. Instead the site ships with:

- an **empty production catalog** (`data/catalog/*.json`), which every page handles gracefully;
- a **repeatable import pipeline** (`npm run catalog:import`) that auto-detects WooCommerce or Shopify, falls back to crawling the sitemap and reading schema.org Product data, and also accepts CSV/JSON exports (see [MIGRATION.md](MIGRATION.md)).

## 2. Existing repository

The repository was empty: no commits, configuration or data. There was nothing to preserve, so the stack was chosen fresh (see the README).

## 3. Data needed to finish the migration

| Item | Needed for | Where it goes |
| --- | --- | --- |
| Network access to `almanfz.com` (environment setting), **or** a product export (CSV/XLSX/JSON) | Product catalog, categories, images, redirects | `npm run catalog:import` |
| Platform admin or API access, if the public API is disabled (WooCommerce consumer key, Shopify Storefront token, Salla/Zid API) | Full catalog including hidden attributes | Extend the matching adapter in `scripts/catalog/sources/` |
| Official logo (SVG preferred) and brand colours | Header, footer, favicon, Open Graph | `public/brand/logo.svg`, `src/components/ui/Logo.tsx`, `public/icon.svg`, `src/app/globals.css` (`@theme`) |
| Legal company name (EN/AR), CR number, VAT number | Footer, Organization structured data | `content/company.json` |
| Phone, sales email, WhatsApp number, address, working hours, map link | Contact page, footer, WhatsApp buttons | `content/company.json` (WhatsApp and the map only appear once these are set) |
| Confirmation of the Arabic brand name | The Arabic UI uses **"المنفذ"** as a transliteration of "Almanfz". Confirm it or supply the official Arabic name | `meta.siteName` in `src/lib/i18n/dictionaries/ar.ts` |
| Confirmation of the "Why Almanfz", About and FAQ copy | This copy uses only the positioning from the project brief (Riyadh-based, supplying across Saudi Arabia, electrical/mechanical/industrial/construction, consolidated quotations). It has no metrics, clients or certifications. Edit it if any statement is inaccurate | `src/lib/i18n/dictionaries/{en,ar}.ts` |
| Privacy policy review | It describes what this website does with submitted data. Have it reviewed against your obligations under the Saudi PDPL | `src/app/[locale]/privacy/page.tsx` |
| Lead destination (CRM webhook URL and/or email provider key) | Quote, BOQ and contact submissions in production | Environment variables (`.env.example`) |
| GA4 or GTM ID (optional) | Analytics | `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_GTM_ID` |
| Project or industrial photography with usage rights (optional) | The hero uses a drawn SVG illustration until licensed photography is supplied | `src/components/home/HeroIllustration.tsx` |
| The old site's important URLs and their search traffic (optional) | Checking that redirects cover high-value pages | `data/catalog/redirects.json` (generated) |

## 4. Placeholders and what replaces them

| Placeholder | Behaviour until replaced |
| --- | --- |
| Text wordmark "ALMANFZ" with a simple "A" mark | Shown in the header and footer. Replace it with the official logo |
| Empty catalog | Home, catalog and category pages show a "catalog is being migrated" state that points visitors to the BOQ upload and contact forms |
| Empty `content/company.json` | Contact details, WhatsApp buttons, the map and CR/VAT are hidden. The footer shows "Riyadh" only |
| No lead destination | Forms validate input but tell the visitor the request was **not** sent (HTTP 503). They never fake a success |
