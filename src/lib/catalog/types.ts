// Catalog domain model. Shared by the Next.js app and the Node import scripts,
// so this file (and anything it imports) must stay free of path aliases and
// runtime-only TypeScript features (enums, parameter properties).

export type Locale = "en" | "ar";

/** A string that may be available in one or both site languages. */
export type Localized = Partial<Record<Locale, string>>;

export interface ProductImage {
  /** Absolute URL (original site / CDN) or a root-relative path under /public. */
  src: string;
  alt?: Localized;
  width?: number;
  height?: number;
}

export interface ProductAttribute {
  /** Stable machine key, e.g. "voltage" or "pa_rated-current". */
  key: string;
  label: Localized;
  /** Values exactly as published by the source. Never inferred. */
  values: string[];
}

export interface ProductPrice {
  amount: number;
  currency: string;
  /** Whether the published source price includes VAT, when the source says so. */
  includesVat?: boolean;
  /** ISO timestamp of the import that observed this price. */
  observedAt: string;
}

export interface ProductSource {
  system: string;
  /** Identifier inside the source system (e.g. WooCommerce product id). */
  id?: string;
  url?: string;
  importedAt: string;
}

export interface Product {
  /** Stable internal id, derived from the source system id. */
  id: string;
  slug: string;
  name: Localized;
  sku?: string;
  /** Manufacturer part number / model number, when published separately from SKU. */
  partNumber?: string;
  brand?: string;
  categoryIds: string[];
  /** Short summary, plain text. */
  summary?: Localized;
  /**
   * Full description as plain text. Paragraphs are separated by a blank line;
   * lines beginning with "• " are list items. HTML is stripped at import time.
   */
  description?: Localized;
  images: ProductImage[];
  attributes: ProductAttribute[];
  /** Only present when the source publishes a real, non-zero price. */
  price?: ProductPrice;
  featured?: boolean;
  source: ProductSource;
}

export interface Category {
  id: string;
  slug: string;
  name: Localized;
  description?: Localized;
  parentId?: string;
  image?: ProductImage;
  sourceUrl?: string;
  /** Display order from the source, when available. */
  order?: number;
}

export interface CatalogMeta {
  source: string | null;
  sourceBaseUrl: string | null;
  importedAt: string | null;
  productCount: number;
  categoryCount: number;
}

export interface Redirect {
  /** Old path on the previous website, decoded, without trailing slash. */
  from: string;
  /** New path on this website. */
  to: string;
}
