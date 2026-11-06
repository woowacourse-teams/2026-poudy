import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ fetchProductComparisonForRequest: vi.fn() }));
vi.mock("@/lib/api/products.server", () => api);
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`REDIRECT ${href}`);
  },
}));
vi.mock("@/components/comparison/ProductComparisonScreen", () => ({
  ProductComparisonScreen: ({
    products,
    missingProduct,
  }: {
    readonly products: readonly unknown[];
    readonly missingProduct?: boolean;
  }) => <div data-count={products.length} data-missing={String(Boolean(missingProduct))} />,
}));

import ComparisonResultPage, { generateMetadata } from "./page";

import { ApiError } from "@/lib/api/client";

const render = async (query: Record<string, string>) =>
  renderToStaticMarkup(
    await ComparisonResultPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(query),
    } as PageProps<"/compare/result">),
  );

const notFound = (code: string) => new ApiError(404, code, "없음");

beforeEach(() => {
  api.fetchProductComparisonForRequest.mockReset();
});

describe("제품 비교 페이지", () => {
  it("주소의 제품과 구성품으로 서버에서 받아 그린다", async () => {
    api.fetchProductComparisonForRequest.mockResolvedValue({ items: [{}, {}] });

    const markup = await render({ productIds: "2,1", "partIds[1]": "11" });

    expect(api.fetchProductComparisonForRequest).toHaveBeenCalledWith([{ productId: 2 }, { productId: 1, partId: 11 }]);
    expect(markup).toContain('data-count="2"');
  });

  it("탭 제목은 제품 이름을 vs.로 잇고, 받지 못하면 화면 이름을 쓴다", async () => {
    const metadataOf = (query: Record<string, string>) =>
      generateMetadata({
        params: Promise.resolve({}),
        searchParams: Promise.resolve(query),
      } as PageProps<"/compare/result">);

    api.fetchProductComparisonForRequest.mockResolvedValue({ items: [{ name: "토너" }, { name: "세럼" }] });
    expect((await metadataOf({ productIds: "1,2" })).title).toBe("토너 vs. 세럼");

    api.fetchProductComparisonForRequest.mockRejectedValue(notFound("PRODUCT_NOT_FOUND"));
    expect((await metadataOf({ productIds: "1,2" })).title).toBe("제품 비교");
    expect((await metadataOf({})).title).toBe("제품 비교");
  });

  it("주소에 제품이 없으면 묻지 않고 빈 화면을 그린다", async () => {
    expect(await render({})).toContain('data-count="0"');
    expect(api.fetchProductComparisonForRequest).not.toHaveBeenCalled();
  });

  it("하나뿐이면 그 제품의 상세로 보낸다", async () => {
    await expect(render({ productIds: "7" })).rejects.toThrow("REDIRECT /products/7");
  });

  it("없어진 구성품은 첫 구성품으로 되돌린 주소로 보낸다", async () => {
    api.fetchProductComparisonForRequest.mockRejectedValue(notFound("PRODUCT_PART_NOT_FOUND"));

    await expect(render({ productIds: "2,1", "partIds[1]": "99" })).rejects.toThrow(
      "REDIRECT /compare/result?productIds=2,1",
    );
  });

  it("없어진 제품이 있으면 화면이 안내한다", async () => {
    api.fetchProductComparisonForRequest.mockRejectedValue(notFound("PRODUCT_NOT_FOUND"));

    expect(await render({ productIds: "2,1" })).toContain('data-missing="true"');
  });

  it("그 밖의 실패는 오류 화면으로 넘긴다", async () => {
    const failure = new ApiError(500, "INTERNAL_ERROR", "실패");
    api.fetchProductComparisonForRequest.mockRejectedValue(failure);

    await expect(render({ productIds: "2,1" })).rejects.toBe(failure);
  });
});
