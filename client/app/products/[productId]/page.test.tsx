import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  fetchProductDetail: vi.fn(),
  fetchProductSimilarities: vi.fn(),
  fetchExcludeCodes: vi.fn(),
  fetchUserProduct: vi.fn(),
}));
vi.mock("@/lib/api/products", () => api);
vi.mock("@/lib/api/user-product.server", () => ({ fetchUserProduct: api.fetchUserProduct }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/components/product/ProductDetail", () => ({
  ProductDetail: ({ userProduct }: { readonly userProduct: { readonly wishlisted: boolean } }) => (
    <div data-saved={userProduct.wishlisted} />
  ),
}));

import ProductDetailPage from "./page";

import { ApiError } from "@/lib/api/client";
import { productDetails } from "@/mocks/fixtures";

const props = () => ({ params: Promise.resolve({ productId: "1" }), searchParams: Promise.resolve({}) });

beforeEach(() => {
  vi.resetAllMocks();
  api.fetchProductSimilarities.mockResolvedValue({ items: [] });
  api.fetchExcludeCodes.mockResolvedValue({ items: [] });
});

describe("제품 상세 SSR", () => {
  it("제품 응답을 기다리지 않고 회원 조회를 시작하고, 회원 상태가 확정된 HTML을 반환한다", async () => {
    const product = Promise.withResolvers<(typeof productDetails)[number]>();
    const user = Promise.withResolvers<{
      readonly status: string;
      readonly wishlisted: boolean;
      readonly shelved: boolean;
    }>();
    api.fetchProductDetail.mockReturnValue(product.promise);
    api.fetchUserProduct.mockReturnValue(user.promise);
    const page = ProductDetailPage(props());
    await vi.waitFor(() => {
      expect(api.fetchProductDetail).toHaveBeenCalledWith(1, undefined);
      // 나에게 안 맞는 성분은 구성품마다 달라 제품 상세와 같은 partId 를 넘긴다.
      expect(api.fetchUserProduct).toHaveBeenCalledWith(1, undefined);
    });
    product.resolve(productDetails[0]);
    user.resolve({ status: "ready", wishlisted: true, shelved: false });
    const html = renderToStaticMarkup(await page);
    expect(html).toContain('data-saved="true"');
  });

  it("회원 조회에서 먼저 제품 없음이 도착해도 404 화면으로 처리한다", async () => {
    api.fetchProductDetail.mockResolvedValue(productDetails[0]);
    api.fetchUserProduct.mockRejectedValue(new ApiError(404, "PRODUCT_NOT_FOUND", "없는 제품"));
    await expect(ProductDetailPage(props())).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("회원 조회 장애를 저장하지 않은 상태로 렌더링하지 않는다", async () => {
    api.fetchProductDetail.mockResolvedValue(productDetails[0]);
    api.fetchUserProduct.mockRejectedValue(new Error("upstream unavailable"));
    await expect(ProductDetailPage(props())).rejects.toThrow("upstream unavailable");
  });
});
