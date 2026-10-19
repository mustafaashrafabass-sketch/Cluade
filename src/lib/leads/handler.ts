import { NextResponse } from "next/server";
import { catalog } from "../catalog/repository";
import { pick } from "../catalog/text";
import { siteUrl } from "../company";
import { isLocale, productPath } from "../i18n";
import { log } from "../log";
import { MAX_UPLOAD_BYTES, validateUpload, type ValidatedFile } from "./files";
import { clientIp, rateLimit } from "./rate-limit";
import {
  contactFields,
  contactMessage,
  formDataToObject,
  quoteItems,
  toFieldErrors,
  type FieldErrors,
} from "./schema";
import { createReference, deliverLead, type Lead, type LeadItem, type LeadType } from "./store";

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/** Reject cross-site form posts. Browsers always send Origin on POST fetches. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function resolveItems(raw: unknown, locale: "en" | "ar"): Promise<LeadItem[] | FieldErrors> {
  const parsed = quoteItems.safeParse(raw);
  if (!parsed.success) return { items: "required" };
  const { byId } = await catalog();
  const base = siteUrl();
  return parsed.data.map((item) => {
    // Names and SKUs come from the server-side catalog, never from the client,
    // unless the product has since been removed from the catalog.
    const product = byId.get(item.productId);
    return product
      ? {
          productId: product.id,
          name: pick(product.name, "en") || pick(product.name, locale),
          sku: product.sku ?? null,
          quantity: item.quantity,
          note: item.note,
          url: `${base}${productPath("en", product.slug)}`,
          inCatalog: true,
        }
      : {
          productId: item.productId,
          name: item.name || item.productId,
          sku: item.sku || null,
          quantity: item.quantity,
          note: item.note,
          url: null,
          inCatalog: false,
        };
  });
}

export async function handleLead(type: LeadType, request: Request) {
  if (!sameOrigin(request)) return json(403, { ok: false, error: "forbidden" });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_UPLOAD_BYTES + 512 * 1024) return json(413, { ok: false, error: "validation", fields: { attachment: "fileSize" } });

  if (!rateLimit(`${type}:${clientIp(request.headers)}`)) return json(429, { ok: false, error: "rate_limited" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { ok: false, error: "bad_request" });
  }

  // Honeypot: real visitors never see or fill this field.
  if (String(form.get("website") ?? "") !== "") return json(400, { ok: false, error: "bad_request" });

  const localeRaw = String(form.get("locale") ?? "en");
  const locale = isLocale(localeRaw) ? localeRaw : "en";
  const errors: FieldErrors = {};

  let attachment: ValidatedFile | null = null;
  const file = form.get("attachment");
  if (type !== "contact" && file instanceof File && file.size > 0) {
    const result = await validateUpload(file);
    if (typeof result === "string") errors.attachment = result;
    else attachment = result;
  }

  let lead: Omit<Lead, "reference" | "submittedAt">;

  if (type === "contact") {
    const parsed = contactMessage.safeParse(
      formDataToObject(form, ["fullName", "company", "email", "phone", "subject", "message", "consent"]),
    );
    if (!parsed.success) return json(422, { ok: false, error: "validation", fields: toFieldErrors(parsed.error) });
    const d = parsed.data;
    lead = {
      type,
      locale,
      contact: { fullName: d.fullName, company: d.company, email: d.email, phone: d.phone, city: "" },
      projectName: "",
      subject: d.subject,
      notes: d.message,
      items: [],
      attachment: null,
    };
  } else {
    const parsed = contactFields.safeParse(
      formDataToObject(form, ["fullName", "company", "email", "phone", "city", "projectName", "notes", "consent"]),
    );
    if (!parsed.success) Object.assign(errors, toFieldErrors(parsed.error));

    let items: LeadItem[] = [];
    if (type === "quote") {
      let raw: unknown = [];
      try {
        raw = JSON.parse(String(form.get("items") ?? "[]"));
      } catch {
        errors.items = "required";
      }
      const resolved = await resolveItems(raw, locale);
      if (Array.isArray(resolved)) items = resolved;
      else Object.assign(errors, resolved);
    }

    const notes = parsed.success ? parsed.data.notes : "";
    if (type === "quote" && !errors.items && items.length === 0 && !notes && !attachment) errors.items = "itemsOrNotes";
    if (type === "rfq" && !attachment && !errors.attachment && !notes) errors.attachment = "boqOrRequirements";

    if (!parsed.success || Object.keys(errors).length) return json(422, { ok: false, error: "validation", fields: errors });

    const d = parsed.data;
    lead = {
      type,
      locale,
      contact: { fullName: d.fullName, company: d.company, email: d.email, phone: d.phone, city: d.city },
      projectName: d.projectName,
      subject: "",
      notes: d.notes,
      items,
      attachment,
    };
  }

  const full: Lead = { ...lead, reference: createReference(type), submittedAt: new Date().toISOString() };
  try {
    const result = await deliverLead(full);
    if (!result.ok) {
      return json(result.reason === "not_configured" ? 503 : 502, { ok: false, error: result.reason });
    }
    return json(200, { ok: true, reference: full.reference });
  } catch (error) {
    log("error", "lead.unhandled", { type, error: error instanceof Error ? error.message : String(error) });
    return json(500, { ok: false, error: "failed" });
  }
}
