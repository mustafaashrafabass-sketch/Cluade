import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedLink, TrackOnMount } from "@/components/analytics/TrackedLink";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { Price } from "@/components/catalog/Price";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { quoteLabels, quoteRef } from "@/components/catalog/ProductCard";
import { RichText } from "@/components/catalog/RichText";
import { AddToQuotePanel } from "@/components/quote/AddToQuote";
import { RequestPriceButton } from "@/components/quote/RequestPriceButton";
import { WhatsAppIcon } from "@/components/ui/icons";
import { catalog, getProductBySlug } from "@/lib/catalog/repository";
import { relatedProducts } from "@/lib/catalog/query";
import { pick, pickLang } from "@/lib/catalog/text";
import type { Category } from "@/lib/catalog/types";
import { siteUrl, whatsappLink } from "@/lib/company";
import { categoryPath, format, getDictionary, href, locales, productPath, resolveLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbLd, jsonLd, pageMetadata } from "@/lib/seo";

// Product data only changes on re-import; regenerate periodically so a
// re-imported catalog (and prices) is picked up without a full rebuild.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { products } = await catalog();
  return locales.flatMap((locale) => products.map((p) => ({ locale, slug: p.slug })));
}

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const product = await getProductBySlug(decodeSlug(slug));
  if (!product) return {};
  const t = getDictionary(locale);
  const name = pick(product.name, locale);
  const summary = pick(product.summary, locale) || pick(product.description, locale);
  const description = (summary || `${name}${product.sku ? ` (${t.product.sku} ${product.sku})` : ""} — ${t.meta.tagline}`)
    .replace(/\s+/g, " ")
    .slice(0, 160);
  return pageMetadata({
    locale,
    path: `/products/${encodeURIComponent(product.slug)}`,
    title: product.sku ? `${name} · ${product.sku}` : name,
    description,
    images: product.images.slice(0, 1).map((i) => absoluteUrl(i.src)),
  });
}

function categoryTrail(id: string | undefined, byId: Map<string, Category>): Category[] {
  const trail: Category[] = [];
  let current = id ? byId.get(id) : undefined;
  while (current && trail.length < 6) {
    trail.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return trail;
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale: l, slug } = await params;
  const locale = resolveLocale(l);
  const t = getDictionary(locale);
  const data = await catalog();
  const product = data.bySlug.get(decodeSlug(slug));
  if (!product) notFound();

  const name = pick(product.name, locale);
  const nameLang = pickLang(product.name, locale);
  const description = pick(product.description, locale);
  const summary = pick(product.summary, locale);
  const trail = categoryTrail(product.categoryIds[0], data.categoryById);
  const primaryCategory = trail.at(-1);
  const related = relatedProducts(data.index, product, 4);
  const url = `${siteUrl()}${productPath(locale, product.slug)}`;
  const whatsapp = whatsappLink(
    format(t.product.whatsappMessage, { name, sku: product.sku ? ` (${t.product.sku}: ${product.sku})` : "", url }),
  );
  const alts = product.images.map((img) => pick(img.alt, locale) || format(t.a11y.productImage, { name }));
  const ref = quoteRef(product);
  const quoteHref = href(locale, "/quote");

  const crumbs = [
    { name: t.nav.home, href: href(locale) },
    { name: t.nav.products, href: href(locale, "/products") },
    ...trail.map((c) => ({ name: pick(c.name, locale), href: categoryPath(locale, c.slug) })),
    { name },
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    url,
    sku: product.sku,
    mpn: product.partNumber,
    image: product.images.map((i) => absoluteUrl(i.src)),
    description: (summary || description).slice(0, 5000) || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: primaryCategory ? pick(primaryCategory.name, locale) : undefined,
    additionalProperty: product.attributes.map((a) => ({
      "@type": "PropertyValue",
      name: pick(a.label, locale),
      value: a.values.join(", "),
    })),
    // Offers only when a real public price exists. Availability is never asserted.
    offers:
      product.price && product.price.amount > 0
        ? { "@type": "Offer", price: product.price.amount.toFixed(2), priceCurrency: product.price.currency, url }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productLd)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbLd(crumbs.map((c) => ({ name: c.name, path: c.href ?? productPath(locale, product.slug) }))))}
      />
      <TrackOnMount
        event={{
          name: "view_item",
          item_id: product.id,
          item_name: pick(product.name, "en"),
          item_category: primaryCategory ? pick(primaryCategory.name, "en") : undefined,
          item_brand: product.brand,
        }}
      />

      <div className="border-b border-line bg-white">
        <div className="container-page py-4">
          <Breadcrumbs items={crumbs} label={t.a11y.breadcrumb} />
        </div>
      </div>

      <div className="bg-white">
        <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:py-12">
          <ProductGallery images={product.images} alts={alts} noImageLabel={t.product.noImage} thumbLabel={t.a11y.imageThumbnail} />

          <div className="min-w-0">
            {primaryCategory ? (
              <Link href={categoryPath(locale, primaryCategory.slug)} className="eyebrow hover:underline">
                {pick(primaryCategory.name, locale)}
              </Link>
            ) : null}
            <h1 lang={nameLang} className="mt-2 text-2xl font-bold leading-tight tracking-tight text-navy sm:text-[1.75rem]">
              {name}
            </h1>

            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4 text-sm">
              {product.sku ? (
                <>
                  <dt className="text-slate">{t.product.sku}</dt>
                  <dd className="ltr-id justify-self-start font-semibold">{product.sku}</dd>
                </>
              ) : null}
              {product.partNumber ? (
                <>
                  <dt className="text-slate">{t.product.partNumber}</dt>
                  <dd className="ltr-id justify-self-start font-semibold">{product.partNumber}</dd>
                </>
              ) : null}
              {product.brand ? (
                <>
                  <dt className="text-slate">{t.product.brand}</dt>
                  <dd className="font-semibold">{product.brand}</dd>
                </>
              ) : null}
              {primaryCategory ? (
                <>
                  <dt className="text-slate">{t.product.category}</dt>
                  <dd>
                    <Link href={categoryPath(locale, primaryCategory.slug)} className="font-semibold text-blue hover:underline">
                      {pick(primaryCategory.name, locale)}
                    </Link>
                  </dd>
                </>
              ) : null}
            </dl>

            {summary ? <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink/80" lang={pickLang(product.summary, locale)}>{summary}</p> : null}

            <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-paper p-5">
              <Price price={product.price} locale={locale} t={t.product} size="lg" />
              <p className="mt-1 text-xs text-slate">{t.product.priceNote}</p>
              <div className="mt-5">
                <AddToQuotePanel product={ref} labels={quoteLabels(t)} quoteHref={quoteHref} />
              </div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <RequestPriceButton product={ref} label={t.product.requestPrice} quoteHref={quoteHref} />
                {whatsapp ? (
                  <TrackedLink
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    event={{ name: "contact_click", method: "whatsapp", location: "product" }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius)] border border-[#1f9d55]/40 bg-white px-5 text-[0.9375rem] font-semibold text-[#17803f] hover:bg-[#f0faf4]"
                  >
                    <WhatsAppIcon size={18} />
                    {t.product.whatsapp}
                  </TrackedLink>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-6 py-10 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="specs" className="rounded-[var(--radius-md)] border border-line bg-white p-6">
          <h2 id="specs" className="text-lg font-semibold text-navy">{t.product.specifications}</h2>
          {product.attributes.length ? (
            <table className="mt-4 w-full text-sm">
              <tbody>
                {product.attributes.map((a) => (
                  <tr key={a.key} className="border-t border-line first:border-t-0">
                    <th scope="row" className="w-2/5 py-2.5 pe-4 text-start align-top font-medium text-slate">{pick(a.label, locale)}</th>
                    <td className="py-2.5 align-top font-medium text-ink"><bdi>{a.values.join(", ")}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-slate">{t.product.noSpecifications}</p>
          )}
        </section>
        {description ? (
          <section aria-labelledby="description" className="rounded-[var(--radius-md)] border border-line bg-white p-6">
            <h2 id="description" className="text-lg font-semibold text-navy">{t.product.description}</h2>
            <div className="mt-4">
              <RichText text={description} lang={pickLang(product.description, locale)} />
            </div>
          </section>
        ) : null}
      </div>

      {related.length ? (
        <section aria-labelledby="related" className="container-page pb-16">
          <h2 id="related" className="mb-5 text-xl font-semibold text-navy">{t.product.related}</h2>
          <ProductGrid products={related} categoryById={data.categoryById} locale={locale} t={t} />
        </section>
      ) : null}
    </>
  );
}
