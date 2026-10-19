import Link from "next/link";
import { pick, pickLang } from "@/lib/catalog/text";
import type { Product } from "@/lib/catalog/types";
import { format, href, productPath, type Dictionary, type Locale } from "@/lib/i18n";
import { AddToQuoteButton } from "../quote/AddToQuote";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";

export function quoteRef(product: Product) {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    image: product.images[0]?.src,
  };
}

export function quoteLabels(t: Dictionary) {
  return {
    addToQuote: t.product.addToQuote,
    addedToQuote: t.product.addedToQuote,
    inQuote: t.product.inQuote,
    viewQuote: t.product.viewQuote,
    quantity: t.product.quantity,
    decrease: t.a11y.decreaseQty,
    increase: t.a11y.increaseQty,
  };
}

export function ProductCard({
  product,
  categoryName,
  locale,
  t,
  priority = false,
  headingLevel = "h3",
}: {
  product: Product;
  categoryName?: string;
  locale: Locale;
  t: Dictionary;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const name = pick(product.name, locale);
  const url = productPath(locale, product.slug);
  const Heading = headingLevel;
  const altText = pick(product.images[0]?.alt, locale) || format(t.a11y.productImage, { name });

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-[var(--shadow-raised)]">
      <ProductImage
        image={product.images[0]}
        alt={altText}
        sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 50vw"
        priority={priority}
        noImageLabel={t.product.noImage}
        className="border-b border-line transition-transform duration-300"
      />
      <div className="flex flex-1 flex-col p-4">
        {categoryName ? <p className="text-xs font-medium text-slate">{categoryName}</p> : null}
        <Heading className="mt-1 text-[0.9375rem] font-semibold leading-snug text-ink">
          <Link href={url} lang={pickLang(product.name, locale)} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-blue focus-visible:outline-none">
            {name}
          </Link>
        </Heading>
        <dl className="mt-2 space-y-0.5 text-xs text-slate">
          {product.sku ? (
            <div className="flex gap-1">
              <dt>{t.product.sku}:</dt>
              <dd className="ltr-id font-medium text-ink/80">{product.sku}</dd>
            </div>
          ) : null}
          {product.brand ? (
            <div className="flex gap-1">
              <dt>{t.product.brand}:</dt>
              <dd className="font-medium text-ink/80">{product.brand}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-auto pt-4">
          <div className="mb-3"><Price price={product.price} locale={locale} t={t.product} /></div>
          {/* Above the stretched link so the button stays clickable. */}
          <div className="relative z-10">
            <AddToQuoteButton product={quoteRef(product)} labels={quoteLabels(t)} quoteHref={href(locale, "/quote")} />
          </div>
        </div>
      </div>
    </article>
  );
}
