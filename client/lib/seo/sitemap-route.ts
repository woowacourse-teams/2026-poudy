import type { MetadataRoute } from "next";

import { searchEnginesAllowed } from "@/lib/seo/site";
import { sitemapXml, xmlResponse } from "@/lib/seo/sitemap";

type SitemapEntries = () => Promise<MetadataRoute.Sitemap>;

export const sitemapNotFoundResponse = (): Response =>
  new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export const runtimeSitemapResponse = async (name: string, entries: SitemapEntries): Promise<Response> => {
  if (!searchEnginesAllowed()) return sitemapNotFoundResponse();

  try {
    return xmlResponse(sitemapXml(await entries()));
  } catch (error) {
    console.error(`[sitemap:${name}] XML 생성에 실패했습니다.`, error);
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
};
