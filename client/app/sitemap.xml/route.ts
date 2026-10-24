import { searchEnginesAllowed } from "@/lib/seo/site";
import { sitemapIndexEntries, sitemapIndexUrls, sitemapIndexXml, xmlResponse } from "@/lib/seo/sitemap";
import { sitemapNotFoundResponse } from "@/lib/seo/sitemap-route";

export const dynamic = "force-dynamic";

/** lastmod 를 셈하지 못해도 하위 사이트맵 주소는 알려야 하므로 lastmod 없이 내보낸다. */
export async function GET(): Promise<Response> {
  if (!searchEnginesAllowed()) return sitemapNotFoundResponse();

  try {
    return xmlResponse(sitemapIndexXml(await sitemapIndexEntries()));
  } catch (error) {
    console.error("[sitemap:index] lastmod 계산에 실패해 lastmod 없이 내보냅니다.", error);
    return xmlResponse(sitemapIndexXml(sitemapIndexUrls()));
  }
}
