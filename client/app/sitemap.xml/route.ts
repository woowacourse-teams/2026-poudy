import { absoluteUrl, indexingEnabled } from "@/lib/seo/site";
import { SITEMAP_PATHS, sitemapIndexXml, xmlResponse } from "@/lib/seo/sitemap";
import { sitemapNotFoundResponse } from "@/lib/seo/sitemap-route";

export const dynamic = "force-static";

export function GET() {
  if (!indexingEnabled()) return sitemapNotFoundResponse();
  return xmlResponse(sitemapIndexXml(Object.values(SITEMAP_PATHS).map(absoluteUrl)));
}
