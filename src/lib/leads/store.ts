import { createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ValidatedFile } from "./files";
import { log } from "../log.ts";

/**
 * Lead destinations. A submission is reported as successful only when at least
 * one configured destination confirmed it. With nothing configured, the API
 * returns 503 and the visitor is told the request was NOT sent.
 *
 * LEAD_DESTINATIONS is a comma-separated list of: webhook, email, file.
 * See docs/LEADS.md for payload formats.
 */

export type LeadType = "quote" | "rfq" | "contact";

export interface LeadItem {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  note: string;
  url: string | null;
  inCatalog: boolean;
}

export interface Lead {
  type: LeadType;
  reference: string;
  submittedAt: string;
  locale: string;
  contact: {
    fullName: string;
    company: string;
    email: string;
    phone: string;
    city: string;
  };
  projectName: string;
  subject: string;
  notes: string;
  items: LeadItem[];
  attachment: ValidatedFile | null;
}

type Destination = "webhook" | "email" | "file";

export function configuredDestinations(): Destination[] {
  const list = (process.env.LEAD_DESTINATIONS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Destination => s === "webhook" || s === "email" || s === "file");
  return [...new Set(list)].filter((d) => {
    if (d === "webhook") return Boolean(process.env.LEAD_WEBHOOK_URL);
    if (d === "email") return Boolean(process.env.RESEND_API_KEY && process.env.LEAD_EMAIL_TO && process.env.LEAD_EMAIL_FROM);
    // The file store is a development fallback. On serverless hosts the disk is ephemeral,
    // so it must be explicitly allowed in production.
    return process.env.NODE_ENV !== "production" || process.env.LEAD_FILE_STORE_ALLOW_PRODUCTION === "true";
  });
}

const PREFIX: Record<LeadType, string> = { quote: "Q", rfq: "B", contact: "C" };

export function createReference(type: LeadType, now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `AMZ-${PREFIX[type]}-${date}-${rand}`;
}

function jsonPayload(lead: Lead) {
  const { attachment, ...rest } = lead;
  return {
    ...rest,
    attachment: attachment
      ? {
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          base64: Buffer.from(attachment.bytes).toString("base64"),
        }
      : null,
  };
}

async function sendWebhook(lead: Lead) {
  const body = JSON.stringify(jsonPayload(lead));
  const headers: Record<string, string> = { "content-type": "application/json", "x-almanfz-lead-type": lead.type };
  const secret = process.env.LEAD_WEBHOOK_SECRET;
  if (secret) headers["x-almanfz-signature"] = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const res = await fetch(process.env.LEAD_WEBHOOK_URL!, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderLeadText(lead: Lead): string {
  const lines = [
    `Reference: ${lead.reference}`,
    `Type: ${lead.type}`,
    `Submitted: ${lead.submittedAt}`,
    `Language: ${lead.locale}`,
    "",
    `Name: ${lead.contact.fullName}`,
    `Company: ${lead.contact.company}`,
    `Email: ${lead.contact.email}`,
    `Phone: ${lead.contact.phone}`,
    `City: ${lead.contact.city}`,
  ];
  if (lead.projectName) lines.push(`Project: ${lead.projectName}`);
  if (lead.subject) lines.push(`Subject: ${lead.subject}`);
  if (lead.items.length) {
    lines.push("", "Items:");
    lead.items.forEach((item, i) => {
      lines.push(
        `${i + 1}. ${item.name}${item.sku ? ` [SKU ${item.sku}]` : ""} × ${item.quantity}${item.inCatalog ? "" : " (not in catalog)"}`,
      );
      if (item.note) lines.push(`   Note: ${item.note}`);
      if (item.url) lines.push(`   ${item.url}`);
    });
  }
  if (lead.notes) lines.push("", "Notes:", lead.notes);
  if (lead.attachment) lines.push("", `Attachment: ${lead.attachment.filename} (${lead.attachment.size} bytes)`);
  return lines.join("\n");
}

async function sendEmail(lead: Lead) {
  const subjectByType: Record<LeadType, string> = {
    quote: "Quotation request",
    rfq: "BOQ / RFQ submission",
    contact: "Contact message",
  };
  const text = renderLeadText(lead);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.LEAD_EMAIL_FROM,
      to: process.env.LEAD_EMAIL_TO!.split(",").map((s) => s.trim()),
      reply_to: lead.contact.email,
      subject: `[${lead.reference}] ${subjectByType[lead.type]} — ${lead.contact.company || lead.contact.fullName}`,
      text,
      html: `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`,
      attachments: lead.attachment
        ? [{ filename: lead.attachment.filename, content: Buffer.from(lead.attachment.bytes).toString("base64") }]
        : undefined,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`email provider responded ${res.status}`);
}

async function writeFileStore(lead: Lead) {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LEAD_FILE_DIR ?? ".data/leads");
  await mkdir(dir, { recursive: true });
  const { attachment, ...rest } = lead;
  let attachmentFile: string | null = null;
  if (attachment) {
    attachmentFile = `${lead.reference}-${attachment.filename.replace(/[^\w.\-]+/g, "_")}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ dir, attachmentFile), attachment.bytes, { flag: "wx" });
  }
  await writeFile(
    path.join(/*turbopackIgnore: true*/ dir, `${lead.reference}.json`),
    JSON.stringify(
      {
        ...rest,
        attachment: attachment
          ? { filename: attachment.filename, contentType: attachment.contentType, size: attachment.size, storedAs: attachmentFile }
          : null,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
}

const senders: Record<Destination, (lead: Lead) => Promise<void>> = {
  webhook: sendWebhook,
  email: sendEmail,
  file: writeFileStore,
};

export type DeliveryResult = { ok: true; delivered: Destination[] } | { ok: false; reason: "not_configured" | "failed" };

export async function deliverLead(lead: Lead): Promise<DeliveryResult> {
  const destinations = configuredDestinations();
  if (destinations.length === 0) {
    log("warn", "lead.not_configured", { reference: lead.reference, type: lead.type });
    return { ok: false, reason: "not_configured" };
  }
  const results = await Promise.allSettled(destinations.map((d) => senders[d](lead)));
  const delivered = destinations.filter((_, i) => results[i].status === "fulfilled");
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      log("error", "lead.destination_failed", {
        reference: lead.reference,
        destination: destinations[i],
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
    }
  });
  if (delivered.length === 0) return { ok: false, reason: "failed" };
  // Never log personal data: reference, type and counts only.
  log("info", "lead.delivered", {
    reference: lead.reference,
    type: lead.type,
    destinations: delivered,
    items: lead.items.length,
    attachment: Boolean(lead.attachment),
  });
  return { ok: true, delivered };
}
