import { productEntries, sitemapXml, xmlResponse } from "@/lib/seo/sitemap";

export const revalidate = 43200;

export async function GET() {
  return xmlResponse(sitemapXml(await productEntries()));
}
