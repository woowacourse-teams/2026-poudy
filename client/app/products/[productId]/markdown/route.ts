import { fetchProductDetail } from "@/lib/api/products";
import { markdownResponse, productMarkdown } from "@/lib/seo/markdown";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  return markdownResponse(productId, `/products/${productId}`, {
    fetchDetail: fetchProductDetail,
    render: productMarkdown,
  });
}
