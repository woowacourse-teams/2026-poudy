import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchIngredientDetail: vi.fn(), fetchProducts: vi.fn() }));
vi.mock("@/lib/api/products", () => api);
vi.mock("@/components/ingredient/IngredientTopBar", () => ({ IngredientTopBar: () => null }));
vi.mock("@/components/analytics/TrackActiveTime", () => ({ TrackActiveTime: () => null }));
vi.mock("@/components/analytics/TrackIngredientView", () => ({ TrackIngredientView: () => null }));
vi.mock("@/components/ui/ProductCard", () => ({
  ProductCard: ({ product }: { readonly product: { readonly id: number; readonly name: string } }) => (
    <a href={`/products/${product.id}`}>{product.name}</a>
  ),
}));

import IngredientDetailPage from "./page";

import { ingredientDetails, products } from "@/mocks/fixtures";

beforeEach(() => vi.clearAllMocks());

describe("성분 상세의 포함 제품", () => {
  it("성분 상세 한 응답의 제품을 표시하며 제품 목록 API는 호출하지 않는다", async () => {
    const ingredient = { ...ingredientDetails[0], products: products.slice(0, 3) };
    api.fetchIngredientDetail.mockResolvedValue(ingredient);
    const page = await IngredientDetailPage({
      params: Promise.resolve({ ingredientId: String(ingredient.id) }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);
    expect(api.fetchIngredientDetail).toHaveBeenCalledExactlyOnceWith(ingredient.id, 3);
    expect(api.fetchProducts).not.toHaveBeenCalled();
    for (const product of ingredient.products) expect(html).toContain(`href="/products/${product.id}"`);
  });

  it("제품 미리보기가 없으면 목록 제목을 그리지 않는다", async () => {
    api.fetchIngredientDetail.mockResolvedValue({ ...ingredientDetails[0], products: [] });
    const page = await IngredientDetailPage({
      params: Promise.resolve({ ingredientId: String(ingredientDetails[0].id) }),
      searchParams: Promise.resolve({}),
    });
    expect(renderToStaticMarkup(page)).not.toContain("이 성분이 포함된 제품");
    expect(api.fetchProducts).not.toHaveBeenCalled();
  });
});
