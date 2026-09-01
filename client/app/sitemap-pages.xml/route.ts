import { pageEntries } from "@/lib/seo/sitemap";
import { runtimeSitemapResponse } from "@/lib/seo/sitemap-route";

export const dynamic = "force-dynamic";

export function GET() {
  return runtimeSitemapResponse("pages", pageEntries);
}
