import { fetchIngredientDetail } from "@/lib/api/products";
import { ingredientMarkdown, markdownResponse } from "@/lib/seo/markdown";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ ingredientId: string }> }) {
  const { ingredientId } = await context.params;
  return markdownResponse(ingredientId, `/ingredients/${ingredientId}`, {
    fetchDetail: fetchIngredientDetail,
    render: ingredientMarkdown,
  });
}
