import { z } from "zod";

/**
 * Server-side validation for all lead forms. Error messages are dictionary
 * keys (see form.errors in the i18n dictionaries) so the client can show
 * localised messages next to each field.
 */

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: "tooLong" })
    .transform((v) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""));

const requiredText = (max: number) => text(max).pipe(z.string().min(1, { message: "required" }));

// E.164-ish: optional +, 8–15 digits, allowing spaces, dashes, dots and parentheses.
const phone = z
  .string()
  .trim()
  .min(1, { message: "required" })
  .max(32, { message: "tooLong" })
  .refine((v) => /^\+?[\d\s\-().]{8,}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15, {
    message: "phone",
  });

const email = z
  .string()
  .trim()
  .min(1, { message: "required" })
  .max(254, { message: "tooLong" })
  .pipe(z.email({ message: "email" }));

const consent = z.literal("on", { message: "consent" });

export const contactFields = z.object({
  fullName: requiredText(120),
  company: requiredText(160),
  email,
  phone,
  city: requiredText(80),
  projectName: text(160).optional().default(""),
  notes: text(4000).optional().default(""),
  consent,
});

export const quoteItem = z.object({
  productId: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  note: text(500).optional().default(""),
  // Name/SKU as seen by the visitor; only used when the product no longer exists.
  name: text(300).optional().default(""),
  sku: text(120).optional().default(""),
});

export const quoteItems = z.array(quoteItem).max(200);

export const contactMessage = z.object({
  fullName: requiredText(120),
  company: text(160).optional().default(""),
  email,
  phone: z
    .string()
    .trim()
    .max(32, { message: "tooLong" })
    .refine((v) => v === "" || (v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15), {
      message: "phone",
    })
    .optional()
    .default(""),
  subject: text(200).optional().default(""),
  message: requiredText(4000),
  consent,
});

export type ContactFields = z.infer<typeof contactFields>;
export type QuoteItemInput = z.infer<typeof quoteItem>;
export type ContactMessage = z.infer<typeof contactMessage>;

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (out[key]) continue;
    const msg = issue.message;
    out[key] = ["required", "email", "phone", "tooLong", "consent"].includes(msg)
      ? msg
      : issue.code === "invalid_type"
        ? "required"
        : "required";
  }
  return out;
}

/** Read string fields from FormData into a plain object (files are ignored). */
export function formDataToObject(form: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const v = form.get(key);
    if (typeof v === "string") out[key] = v;
  }
  return out;
}
