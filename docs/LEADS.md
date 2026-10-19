# Lead submissions

Three forms post `multipart/form-data` to API routes:

| Form | Route | Reference prefix |
| --- | --- | --- |
| Quote list | `POST /api/quote` | `AMZ-Q-YYYYMMDD-XXXXXX` |
| BOQ / RFQ upload | `POST /api/rfq` | `AMZ-B-…` |
| Contact | `POST /api/contact` | `AMZ-C-…` |

## Server-side checks

1. **Same-origin.** The `Origin` header must match the host; otherwise the request gets 403.
2. **Rate limit.** 5 submissions per IP per form per 10 minutes, in memory per instance; otherwise 429. Behind several instances, add edge or WAF limits as well.
3. **Honeypot.** If the hidden `website` field is filled, the request gets 400.
4. **zod validation.** Required fields, email, phone (8–15 digits), length limits and consent are checked; failures return 422 with `{ fields: { name: errorKey } }`.
5. **Quote items.** Item names, SKUs and URLs are rebuilt from the server catalog. Values sent by the browser are only used for items that have since been removed from the catalog, and those are flagged `inCatalog: false`.
6. **Attachments.** The file must be `.pdf`, `.xlsx`, `.xls` or `.csv`, no larger than 10 MB, and its content must match the extension: `%PDF-`, ZIP, OLE2, or text without binary bytes. The filename is sanitised.

## Delivery

`LEAD_DESTINATIONS` lists the destinations (`webhook`, `email`, `file`). The API answers `200 { ok: true, reference }` only when at least one destination confirmed delivery:

- **None configured:** `503 { error: "not_configured" }`. The visitor is told the request was not sent and is shown direct contact details when they are configured.
- **All destinations failed:** `502 { error: "failed" }`.

Logs are single-line JSON and contain only the reference, type, counts and destination outcomes. Personal data is never logged.

### Webhook payload

`POST $LEAD_WEBHOOK_URL`, `content-type: application/json`, `x-almanfz-lead-type: quote|rfq|contact`, plus `x-almanfz-signature: sha256=<HMAC of the raw body with LEAD_WEBHOOK_SECRET>` when a secret is set.

```json
{
  "type": "quote",
  "reference": "AMZ-Q-20261019-3FA9C1",
  "submittedAt": "2026-10-19T10:00:00.000Z",
  "locale": "ar",
  "contact": { "fullName": "…", "company": "…", "email": "…", "phone": "…", "city": "…" },
  "projectName": "…",
  "subject": "",
  "notes": "…",
  "items": [
    { "productId": "woocommerce-123", "name": "…", "sku": "…", "quantity": 12, "note": "…", "url": "https://…/en/products/…", "inCatalog": true }
  ],
  "attachment": { "filename": "boq.xlsx", "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "size": 48211, "base64": "…" }
}
```

Any 2xx response counts as delivered. Zapier, Make, n8n, HubSpot/Zoho workflows or a custom endpoint can receive it. Verify the signature before trusting the payload.

### Email (Resend)

`RESEND_API_KEY`, `LEAD_EMAIL_TO` (comma-separated) and `LEAD_EMAIL_FROM` (a verified sender domain) are required. Each lead arrives as a plain-text summary with the attachment, and `reply-to` is set to the customer's email. To use another provider, replace `sendEmail` in `src/lib/leads/store.ts`.

### File store (development)

Writes `<reference>.json` and `<reference>-<filename>` to `LEAD_FILE_DIR` (default `.data/leads`, git-ignored). It is disabled when `NODE_ENV=production` unless `LEAD_FILE_STORE_ALLOW_PRODUCTION=true`. Only enable it on a server with a persistent, backed-up disk; serverless file systems are ephemeral.
