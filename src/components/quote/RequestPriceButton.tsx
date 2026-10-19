"use client";

import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { buttonClass } from "../ui/button";
import { quoteActions, useQuote, type QuoteItem } from "./quote-store";

/** Adds the product (if needed) and takes the visitor straight to the quote form. */
export function RequestPriceButton({
  product,
  label,
  quoteHref,
}: {
  product: Omit<QuoteItem, "quantity" | "note">;
  label: string;
  quoteHref: string;
}) {
  const router = useRouter();
  const { items } = useQuote();
  return (
    <button
      type="button"
      className={buttonClass("secondary", "lg", "w-full sm:w-auto")}
      onClick={() => {
        if (!items.some((i) => i.productId === product.productId)) {
          quoteActions.add(product, 1);
          track({ name: "add_to_quote", item_id: product.productId, item_name: product.name.en ?? product.name.ar ?? "", quantity: 1 });
        }
        router.push(quoteHref);
      }}
    >
      {label}
    </button>
  );
}
