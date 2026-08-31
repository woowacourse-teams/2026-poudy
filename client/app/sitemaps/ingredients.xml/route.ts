import { ingredientEntries, sitemapXml, xmlResponse } from "@/lib/seo/sitemap";

export const revalidate = 86400;

export async function GET() {
  return xmlResponse(sitemapXml(await ingredientEntries()));
}
