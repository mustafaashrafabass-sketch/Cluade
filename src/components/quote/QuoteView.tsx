"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { pick, pickLang } from "@/lib/catalog/text";
import { format, productPath, type Dictionary, type Locale } from "@/lib/i18n";
import { ContactFieldset } from "../forms/ContactFieldset";
import { ConsentField, FileField, Honeypot } from "../forms/fields";
import { fieldError, FormErrorBanner, SuccessPanel } from "../forms/FormStatus";
import { useLeadSubmit } from "../forms/useLeadSubmit";
import { buttonClass } from "../ui/button";
import { ClipboardIcon, TrashIcon } from "../ui/icons";
import { QuantityInput } from "./QuantityInput";
import { quoteActions, useQuote } from "./quote-store";

export function QuoteView({
  locale,
  t,
  links,
  contactHint,
}: {
  locale: Locale;
  t: Pick<Dictionary, "quote" | "form" | "product" | "a11y" | "nav">;
  links: { products: string; rfq: string; privacy: string };
  contactHint?: ReactNode;
}) {
  const quote = useQuote();
  const { state, setState, submit } = useLeadSubmit("/api/quote");
  const [fileError, setFileError] = useState<"fileType" | "fileSize" | null>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (quote.ready && !tracked.current) {
      tracked.current = true;
      track({ name: "view_quote_list", items: quote.items.length });
    }
  }, [quote.ready, quote.items.length]);

  if (state.status === "success") {
    return (
      <div className="mx-auto max-w-2xl">
        <SuccessPanel
          title={t.form.successTitle}
          body={format(t.form.successBody, { ref: state.reference })}
          action={
            <Link href={links.products} className={buttonClass("primary")}>
              {t.quote.continueBrowsing}
            </Link>
          }
        />
      </div>
    );
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (fileError) return;
    const form = new FormData(e.currentTarget);
    form.set(
      "items",
      JSON.stringify(
        quote.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          note: i.note,
          name: i.name.en ?? i.name.ar ?? "",
          sku: i.sku ?? "",
        })),
      ),
    );
    form.set("locale", locale);
    const file = form.get("attachment");
    const result = await submit(form);
    if (result.status === "success") {
      track({ name: "generate_lead", form: "quote", items: quote.items.length, has_attachment: file instanceof File && file.size > 0 });
      quoteActions.clear();
    }
  };

  const itemsError = fieldError(state, "items", t.form);
  const attachmentError = fileError ? t.form.errors[fileError] : fieldError(state, "attachment", t.form);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_28rem]">
      <section aria-labelledby="quote-items" className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="quote-items" className="text-lg font-semibold text-navy">
            {t.nav.quoteList}
            {quote.ready && quote.items.length ? (
              <span className="ms-2 text-sm font-normal text-slate">{format(t.quote.items, { count: quote.items.length })}</span>
            ) : null}
          </h2>
          {quote.items.length ? (
            <button
              type="button"
              className="text-sm font-medium text-slate hover:text-danger"
              onClick={() => {
                if (window.confirm(t.quote.clearConfirm)) quoteActions.clear();
              }}
            >
              {t.quote.clear}
            </button>
          ) : null}
        </div>

        {!quote.ready ? (
          <div className="h-40 animate-pulse rounded-[var(--radius-md)] border border-line bg-white" aria-hidden />
        ) : quote.items.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong bg-white px-6 py-12 text-center">
            <ClipboardIcon size={32} className="mx-auto text-slate" />
            <h3 className="mt-3 text-base font-semibold">{t.quote.emptyTitle}</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate">{t.quote.emptyBody}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={links.products} className={buttonClass("primary", "sm")}>{t.quote.browse}</Link>
              <Link href={links.rfq} className={buttonClass("secondary", "sm")}>{t.nav.submitBoq}</Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line bg-white">
            {quote.items.map((item) => {
              const name = pick(item.name, locale) || item.productId;
              return (
                <li key={item.productId} className="p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius)] border border-line bg-white sm:h-20 sm:w-20">
                      {item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-contain p-1.5" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={productPath(locale, item.slug)} lang={pickLang(item.name, locale)} className="line-clamp-2 font-semibold leading-snug hover:text-blue">
                        {name}
                      </Link>
                      {item.sku ? (
                        <p className="mt-0.5 text-xs text-slate">
                          {t.product.sku}: <span className="ltr-id font-medium text-ink/80">{item.sku}</span>
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <QuantityInput
                          value={item.quantity}
                          onChange={(n) => quoteActions.setQuantity(item.productId, n)}
                          decreaseLabel={t.a11y.decreaseQty}
                          increaseLabel={t.a11y.increaseQty}
                          ariaLabel={format(t.a11y.quantityFor, { name })}
                        />
                        <button
                          type="button"
                          onClick={() => quoteActions.remove(item.productId)}
                          aria-label={format(t.a11y.removeItem, { name })}
                          className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius)] px-2 text-sm text-slate hover:bg-red-50 hover:text-danger"
                        >
                          <TrashIcon size={17} />
                          <span>{t.quote.remove}</span>
                        </button>
                      </div>
                      <label className="mt-3 block">
                        <span className="sr-only">{`${t.quote.itemNote} — ${name}`}</span>
                        <input
                          type="text"
                          value={item.note}
                          maxLength={500}
                          onChange={(e) => quoteActions.setNote(item.productId, e.target.value)}
                          placeholder={`${t.quote.itemNote} · ${t.quote.itemNotePlaceholder}`}
                          className="h-10 w-full rounded-[var(--radius)] border border-line bg-paper px-3 text-[16px] placeholder:text-slate/80 focus:border-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 sm:text-sm"
                        />
                      </label>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {quote.items.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-slate">{t.quote.savedLocally}</p>
            <Link href={links.products} className="font-semibold text-blue hover:underline">{t.quote.continueBrowsing} →</Link>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="quote-form" className="rounded-[var(--radius-md)] border border-line bg-white p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 id="quote-form" className="text-lg font-semibold text-navy">{t.quote.detailsTitle}</h2>
        <form noValidate={false} onSubmit={onSubmit} className="relative mt-5 space-y-5">
          <Honeypot />
          <FormErrorBanner state={state} t={t.form} contactHint={contactHint} />
          {itemsError ? <p role="alert" className="text-sm font-medium text-danger">{itemsError}</p> : null}
          <ContactFieldset
            t={t.form}
            state={state}
            notesDefault={quote.ready ? quote.notes : undefined}
            onNotesChange={quoteActions.setNotes}
            key={quote.ready ? "ready" : "loading"}
          />
          <FileField
            label={t.form.attachment}
            name="attachment"
            hint={t.form.attachmentHint}
            optionalLabel={t.form.optional}
            removeLabel={t.quote.remove}
            error={attachmentError}
            onLocalError={(k) => {
              setFileError(k);
              if (state.status === "invalid") setState({ status: "idle" });
            }}
          />
          <ConsentField label={t.form.consent} error={fieldError(state, "consent", t.form)} privacyHref={links.privacy} privacyLabel={t.nav.privacy} />
          <button type="submit" disabled={state.status === "submitting"} className={buttonClass("primary", "lg", "w-full")}>
            {state.status === "submitting" ? t.form.submitting : t.form.submitQuote}
          </button>
        </form>
      </section>
    </div>
  );
}
