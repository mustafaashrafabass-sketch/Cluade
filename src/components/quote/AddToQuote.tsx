"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { buttonClass } from "../ui/button";
import { CheckIcon, PlusIcon } from "../ui/icons";
import { QuantityInput } from "./QuantityInput";
import { quoteActions, useQuote, type QuoteItem } from "./quote-store";

type ProductRef = Omit<QuoteItem, "quantity" | "note">;

interface Labels {
  addToQuote: string;
  addedToQuote: string;
  inQuote: string;
  viewQuote: string;
  quantity: string;
  decrease: string;
  increase: string;
}

/** Compact "Add to Quote" button used on product cards. */
export function AddToQuoteButton({ product, labels, quoteHref }: { product: ProductRef; labels: Labels; quoteHref: string }) {
  const { items } = useQuote();
  const [justAdded, setJustAdded] = useState(false);
  const inList = items.find((i) => i.productId === product.productId);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className={buttonClass(justAdded ? "secondary" : "primary", "sm", "w-full")}
        onClick={() => {
          quoteActions.add(product, 1);
          setJustAdded(true);
          track({ name: "add_to_quote", item_id: product.productId, item_name: product.name.en ?? product.name.ar ?? "", quantity: 1 });
        }}
      >
        {justAdded ? <CheckIcon size={16} className="text-success" /> : <PlusIcon size={16} />}
        {justAdded ? labels.addedToQuote : labels.addToQuote}
      </button>
      <span aria-live="polite" className="sr-only">{justAdded ? labels.addedToQuote : ""}</span>
      {inList && !justAdded ? (
        <Link href={quoteHref} className="text-center text-xs font-medium text-blue hover:underline">
          {labels.inQuote.replace("{qty}", String(inList.quantity))}
        </Link>
      ) : null}
    </div>
  );
}

/** Quantity selector + Add to Quote used on the product detail page. */
export function AddToQuotePanel({ product, labels, quoteHref }: { product: ProductRef; labels: Labels; quoteHref: string }) {
  const { items } = useQuote();
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<string>("");
  const inList = items.find((i) => i.productId === product.productId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="qty" className="mb-1.5 block text-sm font-medium text-ink">{labels.quantity}</label>
          <QuantityInput id="qty" value={qty} onChange={setQty} decreaseLabel={labels.decrease} increaseLabel={labels.increase} />
        </div>
        <button
          type="button"
          className={buttonClass("primary", "lg", "min-w-48 flex-1 sm:flex-none")}
          onClick={() => {
            quoteActions.add(product, qty);
            setStatus(labels.addedToQuote);
            track({ name: "add_to_quote", item_id: product.productId, item_name: product.name.en ?? product.name.ar ?? "", quantity: qty });
          }}
        >
          <PlusIcon size={18} />
          {labels.addToQuote}
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm">
        {inList ? (
          <span className="inline-flex items-center gap-1.5 text-success">
            <CheckIcon size={16} />
            {status ? `${status} · ` : ""}
            {labels.inQuote.replace("{qty}", String(inList.quantity))}
            <Link href={quoteHref} className="ms-1 font-semibold text-blue hover:underline">{labels.viewQuote}</Link>
          </span>
        ) : null}
      </p>
    </div>
  );
}
