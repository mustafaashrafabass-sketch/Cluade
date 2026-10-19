import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/company";

export default function robots(): MetadataRoute.Robots {
  // Set NEXT_PUBLIC_ALLOW_INDEXING=false on staging/preview deployments.
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === "false") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/en/quote", "/ar/quote"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
