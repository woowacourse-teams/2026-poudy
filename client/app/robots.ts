import type { MetadataRoute } from "next";

import { absoluteUrl, indexingEnabled, siteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/products/"],
      disallow: ["/products", "/search", "/saved"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl().origin,
  };
}
