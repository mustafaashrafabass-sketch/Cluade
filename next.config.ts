import type { NextConfig } from "next";

// Hosts allowed for remote catalog images (comma-separated). Defaults to the
// previous website, where existing product photos are currently hosted.
const imageHosts = (process.env.CATALOG_IMAGE_HOSTS ?? "almanfz.com,www.almanfz.com")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Catalog JSON is read at runtime; make sure it ships with every server function.
  outputFileTracingIncludes: { "/**": ["./data/catalog/**/*"] },
  reactStrictMode: true,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
