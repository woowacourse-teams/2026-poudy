import { rssIngredients, rssResponse, rssXml } from "@/lib/seo/rss";
import { searchEnginesAllowed } from "@/lib/seo/site";
import { sitemapNotFoundResponse } from "@/lib/seo/sitemap-route";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!searchEnginesAllowed()) return sitemapNotFoundResponse();

  try {
    return rssResponse(rssXml(await rssIngredients()));
  } catch (error) {
    console.error("[rss] XML 생성에 실패했습니다.", error);
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}
