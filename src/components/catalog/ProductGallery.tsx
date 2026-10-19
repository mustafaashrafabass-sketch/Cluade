"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage as Img } from "@/lib/catalog/types";
import { ProductImage } from "./ProductImage";

export function ProductGallery({
  images,
  alts,
  noImageLabel,
  thumbLabel,
}: {
  images: Img[];
  alts: string[];
  noImageLabel: string;
  thumbLabel: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <ProductImage
        image={images[active]}
        alt={alts[active] ?? ""}
        sizes="(min-width: 1024px) 560px, 100vw"
        priority
        noImageLabel={noImageLabel}
        className="rounded-[var(--radius-md)] border border-line"
      />
      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {images.slice(0, 10).map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={thumbLabel.replace("{n}", String(i + 1))}
                aria-pressed={i === active}
                className={`relative block aspect-square w-full overflow-hidden rounded-[var(--radius)] border bg-white ${
                  i === active ? "border-blue ring-1 ring-blue" : "border-line hover:border-line-strong"
                }`}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
