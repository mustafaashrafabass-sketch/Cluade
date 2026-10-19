import Image from "next/image";
import type { ProductImage as Img } from "@/lib/catalog/types";

/** Square product image with a neutral placeholder when the source has no photo. */
export function ProductImage({
  image,
  alt,
  sizes,
  priority = false,
  noImageLabel,
  className = "",
}: {
  image?: Img;
  alt: string;
  sizes: string;
  priority?: boolean;
  noImageLabel: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-white ${className}`}>
      {image ? (
        <Image
          src={image.src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-4"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-paper text-slate" role="img" aria-label={noImageLabel}>
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="8" y="12" width="32" height="24" rx="2" />
            <path d="M8 30l9-8 7 6 5-4 11 8" />
            <circle cx="31" cy="19" r="3" />
          </svg>
          <span className="text-xs">{noImageLabel}</span>
        </div>
      )}
    </div>
  );
}
