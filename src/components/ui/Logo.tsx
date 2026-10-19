/**
 * Text wordmark used until the official Almanfz logo file is supplied.
 * To use the real logo, add it at public/brand/logo.svg and replace the
 * contents of this component with an <Image> of it (see docs/AUDIT.md).
 */
export function Logo({ inverse = false, tagline }: { inverse?: boolean; tagline?: string }) {
  return (
    <span className="flex items-center gap-2.5" dir="ltr">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden focusable={false} className="shrink-0">
        <rect width="34" height="34" rx="4" fill={inverse ? "#ffffff" : "#12263A"} />
        <path d="M9 24 15.5 9h3L25 24h-3.6l-1.3-3.3h-6.2L12.6 24z" fill={inverse ? "#12263A" : "#ffffff"} />
        <path d="M14.9 17.8h4.2L17 12.3z" fill="#2563EB" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`text-[1.0625rem] font-bold tracking-[0.14em] ${inverse ? "text-white" : "text-navy"}`}>
          ALMANFZ
        </span>
        {tagline ? (
          <span className={`mt-1 text-[0.625rem] font-medium tracking-[0.04em] ${inverse ? "text-white/60" : "text-slate"}`}>
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
