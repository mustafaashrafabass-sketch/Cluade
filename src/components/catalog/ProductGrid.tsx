import type { Category, Product } from "@/lib/catalog/types";
import { pick } from "@/lib/catalog/text";
import type { Dictionary, Locale } from "@/lib/i18n";
import { ProductCard } from "./ProductCard";

export function ProductGrid({
  products,
  categoryById,
  locale,
  t,
  priorityCount = 0,
  headingLevel,
}: {
  products: Product[];
  categoryById: Map<string, Category>;
  locale: Locale;
  t: Dictionary;
  priorityCount?: number;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => {
        const cat = p.categoryIds.map((id) => categoryById.get(id)).find(Boolean);
        return (
          <li key={p.id} className="flex [&>article]:w-full">
            <ProductCard
              product={p}
              categoryName={cat ? pick(cat.name, locale) : undefined}
              locale={locale}
              t={t}
              priority={i < priorityCount}
              headingLevel={headingLevel}
            />
          </li>
        );
      })}
    </ul>
  );
}
