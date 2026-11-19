/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Page from "./page";

import { ApiError } from "@/lib/api/client";
import { SIGNED_OUT_USER_PRODUCT } from "@/lib/domain/user-product";
import { productDetails, productSimilarities } from "@/mocks/fixtures";

const api = vi.hoisted(() => ({ fetchProductDetail: vi.fn(), fetchProductSimilarities: vi.fn() }));
const member = vi.hoisted(() => ({ fetchUserProduct: vi.fn() }));
vi.mock("@/lib/api/products", () => api);
vi.mock("@/lib/api/user-product.server", () => member);
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const props = (productId = "1", query: Record<string, string> = {}): PageProps<"/similar-products/[productId]"> => ({
  params: Promise.resolve({ productId }),
  searchParams: Promise.resolve(query),
});

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchProductDetail.mockResolvedValue(productDetails[0]);
  api.fetchProductSimilarities.mockResolvedValue({ partId: 1, calculated: false, items: [] });
  member.fetchUserProduct.mockResolvedValue(SIGNED_OUT_USER_PRODUCT);
});

describe("유사템 결과 주소", () => {
  it("직접 진입해도 구성품과 기본 가격 정렬로 최대 10개를 조회한다", async () => {
    render(await Page(props("1", { partId: "12" })));
    expect(api.fetchProductDetail).toHaveBeenCalledWith(1, 12);
    expect(api.fetchProductSimilarities).toHaveBeenCalledWith(1, 12, { size: 10, sort: "UNIT_PRICE_ASC" });
    expect(screen.getByText("아직 비교할 유사템이 없어요")).toBeInTheDocument();
  });

  it("URL의 성분 정렬을 조회에 전달한다", async () => {
    await Page(props("1", { sort: "SIMILARITY" }));
    expect(api.fetchProductSimilarities).toHaveBeenCalledWith(1, undefined, { size: 10, sort: "SIMILARITY" });
  });

  it("나만의 필터 성분이 든 유사템에 주의 칩을 붙이고, 회원 정보 실패는 결과를 막지 않는다", async () => {
    const [first, second] = productSimilarities.get(1)!;
    api.fetchProductSimilarities.mockResolvedValue({
      partId: 1,
      calculated: true,
      items: [
        { ...first!, containsExcludedIngredient: false },
        { ...second!, containsExcludedIngredient: false },
      ],
    });
    member.fetchUserProduct.mockResolvedValue({
      ...SIGNED_OUT_USER_PRODUCT,
      status: "ready",
      similarProducts: [{ id: second!.id, containsMyFilterIngredient: true }],
    });
    const view = render(await Page(props("1", { sort: "SIMILARITY" })));
    expect(member.fetchUserProduct).toHaveBeenCalledWith(1, undefined, { size: 10, sort: "SIMILARITY" });
    expect(screen.getAllByText("주의 있음")).toHaveLength(1);
    view.unmount();

    member.fetchUserProduct.mockRejectedValue(new Error("회원 정보 실패"));
    render(await Page(props("1")));
    expect(screen.getAllByRole("link", { name: /토너/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("주의 있음")).not.toBeInTheDocument();
  });

  it.each([
    ["abc", {}],
    ["0", {}],
    ["1", { partId: "abc" }],
  ])("잘못된 제품·구성품 ID는 404다", async (id, query) => {
    await expect(Page(props(id, query))).rejects.toThrow("NOT_FOUND");
    expect(api.fetchProductDetail).not.toHaveBeenCalled();
  });

  it("서버가 없는 구성품으로 응답하면 404다", async () => {
    api.fetchProductSimilarities.mockRejectedValue(new ApiError(404, "PRODUCT_PART_NOT_FOUND", "없는 구성품"));
    await expect(Page(props("1", { partId: "999" }))).rejects.toThrow("NOT_FOUND");
  });

  it("유사템 조회 실패는 빈 결과로 처리하지 않는다", async () => {
    api.fetchProductSimilarities.mockRejectedValue(new ApiError(500, "INTERNAL_SERVER_ERROR", "오류"));
    render(await Page(props()));
    expect(screen.getByText("유사템을 불러오지 못했어요", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("아직 비교할 유사템이 없어요")).not.toBeInTheDocument();
  });
});
