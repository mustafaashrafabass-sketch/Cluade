import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { sanitizeFilename, validateUpload, MAX_UPLOAD_BYTES } from "../../src/lib/leads/files.ts";
import { contactFields, quoteItems, toFieldErrors } from "../../src/lib/leads/schema.ts";
import { rateLimit } from "../../src/lib/leads/rate-limit.ts";
import { createReference, deliverLead, type Lead } from "../../src/lib/leads/store.ts";

const file = (name: string, bytes: number[] | string) =>
  new File([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], name);

describe("upload validation", () => {
  it("accepts real PDF, XLSX, XLS and CSV content", async () => {
    for (const f of [
      file("boq.pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]),
      file("boq.xlsx", [0x50, 0x4b, 0x03, 0x04, 0, 0]),
      file("boq.xls", [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      file("boq.csv", "item,qty\nكابل,10\n"),
    ]) {
      const r = await validateUpload(f);
      assert.equal(typeof r, "object", f.name);
    }
  });
  it("rejects disguised or unsupported files", async () => {
    assert.equal(await validateUpload(file("boq.pdf", "<html>")), "fileContent");
    assert.equal(await validateUpload(file("boq.exe", [0x4d, 0x5a])), "fileType");
    assert.equal(await validateUpload(file("boq.csv", [0x4d, 0x5a, 0x00, 0x01])), "fileContent");
    assert.equal(await validateUpload(file("boq.pdf", [])), "fileContent");
  });
  it("rejects files over the size limit", async () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "boq.csv");
    assert.equal(await validateUpload(big), "fileSize");
  });
  it("sanitises filenames", () => {
    assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
    assert.equal(sanitizeFilename('C:\\tmp\\a<b>"c".pdf'), "abc.pdf");
  });
});

describe("form validation", () => {
  const valid = {
    fullName: "Test Person",
    company: "Test Co",
    email: "buyer@example.com",
    phone: "+966 50 000 0000",
    city: "Riyadh",
    consent: "on",
  };
  it("accepts a valid submission", () => {
    assert.ok(contactFields.safeParse(valid).success);
  });
  it("reports field-level error keys", () => {
    const r = contactFields.safeParse({ ...valid, email: "nope", phone: "12", fullName: " ", consent: undefined });
    assert.equal(r.success, false);
    const errors = toFieldErrors(r.error!);
    assert.equal(errors.email, "email");
    assert.equal(errors.phone, "phone");
    assert.equal(errors.fullName, "required");
    assert.equal(errors.consent, "consent");
  });
  it("validates quote items", () => {
    assert.ok(quoteItems.safeParse([{ productId: "x", quantity: "3" }]).success);
    assert.equal(quoteItems.safeParse([{ productId: "x", quantity: 0 }]).success, false);
    assert.equal(quoteItems.safeParse([{ productId: "x", quantity: 1.5 }]).success, false);
  });
  it("rate limits per key", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) assert.ok(rateLimit(key, 5, 60_000, 1000));
    assert.equal(rateLimit(key, 5, 60_000, 1000), false);
    assert.ok(rateLimit(key, 5, 60_000, 1000 + 60_001));
  });
});

describe("lead delivery", () => {
  const env = { ...process.env };
  const lead = (): Lead => ({
    type: "rfq",
    reference: createReference("rfq"),
    submittedAt: new Date().toISOString(),
    locale: "en",
    contact: { fullName: "T", company: "C", email: "t@example.com", phone: "+966500000000", city: "Riyadh" },
    projectName: "",
    subject: "",
    notes: "n",
    items: [],
    attachment: { filename: "boq.csv", contentType: "text/csv", size: 3, bytes: new TextEncoder().encode("a,b") },
  });
  let server: ReturnType<typeof createServer>;
  let received: { body: string; signature?: string }[] = [];
  let port = 0;

  before(async () => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        received.push({ body, signature: req.headers["x-almanfz-signature"] as string | undefined });
        res.writeHead(req.url === "/fail" ? 500 : 200).end("ok");
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as { port: number }).port;
  });
  after(() => {
    server.close();
    process.env = env;
  });

  it("refuses to report success when nothing is configured", async () => {
    process.env.LEAD_DESTINATIONS = "";
    assert.deepEqual(await deliverLead(lead()), { ok: false, reason: "not_configured" });
  });

  it("posts a signed JSON payload to the webhook", async () => {
    received = [];
    Object.assign(process.env, { LEAD_DESTINATIONS: "webhook", LEAD_WEBHOOK_URL: `http://127.0.0.1:${port}/hook`, LEAD_WEBHOOK_SECRET: "s3cret" });
    const r = await deliverLead(lead());
    assert.deepEqual(r, { ok: true, delivered: ["webhook"] });
    const body = JSON.parse(received[0].body);
    assert.equal(body.type, "rfq");
    assert.equal(Buffer.from(body.attachment.base64, "base64").toString(), "a,b");
    assert.equal(received[0].signature, `sha256=${createHmac("sha256", "s3cret").update(received[0].body).digest("hex")}`);
  });

  it("reports failure when the only destination fails", async () => {
    Object.assign(process.env, { LEAD_DESTINATIONS: "webhook", LEAD_WEBHOOK_URL: `http://127.0.0.1:${port}/fail` });
    assert.deepEqual(await deliverLead(lead()), { ok: false, reason: "failed" });
  });

  it("writes to the local file store in development", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "leads-"));
    Object.assign(process.env, { LEAD_DESTINATIONS: "file", LEAD_FILE_DIR: dir, NODE_ENV: "test" });
    const l = lead();
    assert.deepEqual(await deliverLead(l), { ok: true, delivered: ["file"] });
    const files = await readdir(dir);
    assert.ok(files.includes(`${l.reference}.json`));
    const saved = JSON.parse(await readFile(path.join(dir, `${l.reference}.json`), "utf8"));
    assert.equal(saved.attachment.filename, "boq.csv");
  });
});
