import { absoluteUrl } from "@/lib/seo/site";
import { SITEMAP_PATHS, sitemapIndexXml, xmlResponse } from "@/lib/seo/sitemap";

export const dynamic = "force-static";

export function GET() {
  return xmlResponse(sitemapIndexXml(Object.values(SITEMAP_PATHS).map(absoluteUrl)));
}
