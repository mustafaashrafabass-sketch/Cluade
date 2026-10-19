import Image from "next/image";
import Link from "next/link";
import { pick } from "@/lib/catalog/text";
import type { Category, ProductImage } from "@/lib/catalog/types";
import { categoryPath, format, formatNumber, type Dictionary, type Locale } from "@/lib/i18n";
import { ArrowIcon, LayersIcon } from "../ui/icons";

export function CategoryCard({
  category,
  image,
  count,
  locale,
  t,
}: {
  category: Category;
  image?: ProductImage;
  count: number;
  locale: Locale;
  t: Dictionary;
}) {
  const name = pick(category.name, locale);
  return (
    <Link
      href={categoryPath(locale, category.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-line bg-white transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-raised)]"
    >
      <div className="relative aspect-[4/3] border-b border-line bg-paper">
        {image ? (
          <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 300px, 50vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/25">
            <LayersIcon size={48} />
          </div>
        )}
      </div>
      <div className="flex flex-1 items-end justify-between gap-3 p-4">
        <div>
          <h3 className="font-semibold leading-snug text-ink group-hover:text-blue">{name}</h3>
          <p className="mt-1 text-xs text-slate">{format(t.categories.productsCount, { count: formatNumber(locale, count) })}</p>
        </div>
        <ArrowIcon size={18} className="shrink-0 text-slate transition-transform group-hover:translate-x-0.5 group-hover:text-blue rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </div>
    </Link>
  );
}
