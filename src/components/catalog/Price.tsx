import { formatPrice, type Dictionary, type Locale } from "@/lib/i18n";
import type { ProductPrice } from "@/lib/catalog/types";

/** Shows a verified price, or "Request Price". Never shows zero or an invented price. */
export function Price({
  price,
  locale,
  t,
  size = "sm",
}: {
  price?: ProductPrice;
  locale: Locale;
  t: Dictionary["product"];
  size?: "sm" | "lg";
}) {
  if (!price || !(price.amount > 0)) {
    return (
      <span className={size === "lg" ? "text-lg font-semibold text-navy" : "text-sm font-semibold text-navy"}>
        {t.requestPrice}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className={`ltr-id font-semibold text-ink ${size === "lg" ? "text-2xl" : "text-base"}`}>
        {formatPrice(locale, price.amount, price.currency)}
      </span>
      {price.includesVat !== undefined ? (
        <span className="text-xs text-slate">{price.includesVat ? t.vatIncluded : t.vatExcluded}</span>
      ) : null}
    </span>
  );
}
