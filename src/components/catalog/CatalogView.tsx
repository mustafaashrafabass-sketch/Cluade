import Link from "next/link";
import { TrackOnMount } from "@/components/analytics/TrackedLink";
import { catalog, getCategoryTree } from "@/lib/catalog/repository";
import { parseCatalogSearchParams, queryCatalog, SORT_KEYS, type CatalogQuery } from "@/lib/catalog/query";
import { pick } from "@/lib/catalog/text";
import type { Category } from "@/lib/catalog/types";
import { categoryPath, format, formatNumber, href, type Dictionary, type Locale } from "@/lib/i18n";
import { buttonClass } from "../ui/button";
import { ChevronDownIcon, SearchIcon } from "../ui/icons";
import { AutoSubmitForm } from "./AutoSubmitForm";
import { FilterPanel } from "./FilterPanel";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";

type Params = Record<string, string | string[] | undefined>;

function buildSearch(query: CatalogQuery, overrides: Partial<CatalogQuery> = {}, includeCategory = true) {
  const q = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (includeCategory && q.category) params.set("category", q.category);
  for (const b of q.brands ?? []) params.append("brand", b);
  for (const [k, values] of Object.entries(q.attributes ?? {})) for (const v of values) params.append(`attr.${k}`, v);
  if (q.sort) params.set("sort", q.sort);
  if (q.page && q.page > 1) params.set("page", String(q.page));
  return params.size ? `?${params}` : "";
}

const checkbox =
  "h-4 w-4 shrink-0 rounded-[2px] border-line-strong accent-blue focus-visible:outline-2 focus-visible:outline-offset-2";

export async function CatalogView({
  locale,
  t,
  searchParams,
  category,
}: {
  locale: Locale;
  t: Dictionary;
  searchParams: Params;
  /** When rendering a category page, the category is fixed by the URL. */
  category?: Category;
}) {
  const data = await catalog();
  const query = parseCatalogSearchParams(searchParams);
  if (category) query.category = category.slug;
  const result = queryCatalog(data.index, query, locale);
  const { top } = await getCategoryTree();

  const basePath = category ? categoryPath(locale, category.slug) : href(locale, "/products");
  const hrefFor = (page: number) => `${basePath}${buildSearch(query, { page }, !category)}`;
  const activeFilters = (query.brands?.length ?? 0) + Object.values(query.attributes ?? {}).flat().length;
  const catalogEmpty = data.products.length === 0;
  const categoryName = category ? pick(category.name, locale) : undefined;
  const sortOptions = SORT_KEYS.filter((k) => (k === "relevance" ? Boolean(query.q) : k.startsWith("price") ? result.hasPrices : true));

  if (catalogEmpty) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong bg-white px-6 py-14 text-center">
        <h2 className="text-lg font-semibold text-ink">{t.catalog.emptyCatalogTitle}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate">{t.catalog.emptyCatalogBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={href(locale, "/rfq")} className={buttonClass("primary")}>{t.nav.submitBoq}</Link>
          <Link href={href(locale, "/contact")} className={buttonClass("secondary")}>{t.nav.contact}</Link>
        </div>
      </div>
    );
  }

  const filters = (
    <div className="space-y-7">
      {!category && top.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{t.catalog.categories}</legend>
          <div className="mt-3 space-y-1">
            <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
              <input type="radio" name="category" value="" defaultChecked={!query.category} className={checkbox} />
              <span>{t.catalog.allCategories}</span>
            </label>
            {top.map(({ category: c, count }) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                <input type="radio" name="category" value={c.slug} defaultChecked={query.category === c.slug} className={checkbox} />
                <span className="flex-1">{pick(c.name, locale)}</span>
                <span className="ltr-id text-xs text-slate">{formatNumber(locale, count)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {result.brands.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{t.catalog.brands}</legend>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pe-1">
            {result.brands.map((b) => (
              <label key={b.value} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                <input type="checkbox" name="brand" value={b.value} defaultChecked={query.brands?.includes(b.value)} className={checkbox} />
                <span className="flex-1">{b.value}</span>
                <span className="ltr-id text-xs text-slate">{formatNumber(locale, b.count)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {result.attributes.map((a) => (
        <fieldset key={a.key}>
          <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-slate">{pick(a.label, locale)}</legend>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pe-1">
            {a.values.map((v) => (
              <label key={v.value} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
                <input
                  type="checkbox"
                  name={`attr.${a.key}`}
                  value={v.value}
                  defaultChecked={query.attributes?.[a.key]?.includes(v.value)}
                  className={checkbox}
                />
                <span className="flex-1">{v.value}</span>
                <span className="ltr-id text-xs text-slate">{formatNumber(locale, v.count)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <noscript>
        <button type="submit" className={buttonClass("primary", "sm", "w-full")}>{t.catalog.applyFilters}</button>
      </noscript>
    </div>
  );

  // The key forces uncontrolled inputs to reset when the URL changes.
  const formKey = buildSearch(query);

  return (
    <>
      {query.q ? <TrackOnMount event={{ name: "search", search_term: query.q, results: result.total }} /> : null}
      {category ? (
        <TrackOnMount event={{ name: "view_item_list", item_list_id: category.slug, item_list_name: pick(category.name, "en") }} />
      ) : null}
      <AutoSubmitForm key={formKey} action={basePath} className="group/form">
        <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">{t.search.label}</span>
            <SearchIcon size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate" />
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder={t.search.placeholder}
              maxLength={120}
              className="h-11 w-full rounded-[var(--radius)] border border-line-strong bg-white ps-10 pe-24 text-[16px] placeholder:text-slate focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 sm:text-sm"
            />
            <button type="submit" className={buttonClass("primary", "sm", "absolute end-1 top-1")}>{t.search.submit}</button>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap text-slate">{t.catalog.sort}</span>
            <span className="relative">
              <select
                name="sort"
                defaultValue={query.sort ?? (query.q ? "relevance" : "name-asc")}
                className="h-11 appearance-none rounded-[var(--radius)] border border-line-strong bg-white ps-3 pe-9 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              >
                {sortOptions.map((k) => (
                  <option key={k} value={k}>{t.catalog.sortOptions[k]}</option>
                ))}
              </select>
              <ChevronDownIcon size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate" />
            </span>
          </label>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
          <aside aria-label={t.catalog.filters}>
            <FilterPanel label={t.catalog.showFilters} activeCount={activeFilters}>
              {filters}
            </FilterPanel>
          </aside>

          <section aria-labelledby="results-heading" className="min-w-0 transition-opacity group-data-[pending]/form:opacity-60">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="results-heading" className="text-sm text-slate" aria-live="polite">
                <span className="font-semibold text-ink">
                  {result.total === 1 ? t.catalog.resultsCountOne : format(t.catalog.resultsCount, { count: formatNumber(locale, result.total) })}
                </span>
                {query.q ? <> {format(t.catalog.resultsFor, { q: query.q })}</> : null}
                {categoryName && !query.q ? <> · {categoryName}</> : null}
              </h2>
              {activeFilters || query.q || (!category && query.category) ? (
                <Link href={basePath} className="text-sm font-medium text-blue hover:underline">{t.catalog.clearAll}</Link>
              ) : null}
            </div>

            {result.items.length ? (
              <ProductGrid products={result.items} categoryById={data.categoryById} locale={locale} t={t} priorityCount={4} headingLevel="h3" />
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-line-strong bg-white px-6 py-12 text-center">
                <h3 className="text-base font-semibold">{t.catalog.emptyTitle}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate">{t.catalog.emptyBody}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href={basePath} className={buttonClass("secondary", "sm")}>{t.catalog.clearAll}</Link>
                  <Link href={href(locale, "/rfq")} className={buttonClass("primary", "sm")}>{t.nav.submitBoq}</Link>
                </div>
              </div>
            )}

            <Pagination page={result.page} pageCount={result.pageCount} hrefFor={hrefFor} t={t.catalog} label={t.a11y.pagination} />
          </section>
        </div>
      </AutoSubmitForm>
    </>
  );
}
