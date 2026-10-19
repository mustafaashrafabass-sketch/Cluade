type Variant = "primary" | "secondary" | "ghost" | "inverse" | "outline-inverse";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-700 active:bg-blue-700 shadow-sm",
  secondary: "border border-line-strong bg-white text-ink hover:border-navy hover:bg-paper",
  ghost: "text-ink hover:bg-navy/5",
  inverse: "bg-white text-navy hover:bg-paper",
  "outline-inverse": "border border-white/30 text-white hover:border-white hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-[0.9375rem] gap-2",
};

/** Class names for buttons and button-styled links. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return [
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius)] font-semibold",
    "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  ].join(" ");
}
