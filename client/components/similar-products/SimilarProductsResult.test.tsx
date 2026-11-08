/** @vitest-environment jsdom */
import type { ProductSimilarityResponse, SimilarProductResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimilarProductsResult } from "./SimilarProductsResult";

import { track } from "@/lib/analytics/track";
import { productDetails, productSimilarities } from "@/mocks/fixtures";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const source = productDetails[0]!;
const candidate = productSimilarities.get(source.id)![0]!;
const item = (overrides: Partial<SimilarProductResponse> = {}): SimilarProductResponse => ({
  ...candidate,
  unitPrice: 460,
  unitPriceComparison: "CHEAPER",
  unitPriceDifferencePercent: -54,
  ...overrides,
});
const response = (items: SimilarProductResponse[]): ProductSimilarityResponse => ({
  partId: source.selectedPart!.id,
  calculated: true,
  items,
});

beforeEach(() => vi.clearAllMocks());

describe("유사템 결과", () => {
  it("이름 없는 구성품도 순서로 비교 대상을 구분한다", () => {
    render(
      <SimilarProductsResult
        product={{
          ...source,
          productParts: [{ id: 999, name: "첫 구성품", cautionCount: 0 }, ...source.productParts],
          selectedPart: { ...source.selectedPart!, name: null },
        }}
        response={response([])}
        sort="UNIT_PRICE_ASC"
      />,
    );
    expect(screen.getByText("비교 구성품: 02 구성품")).toBeInTheDocument();
  });
  it.each([0, 1, 9, 10])("후보 %i개를 제목과 목록에 맞게 표시한다", (count) => {
    render(
      <SimilarProductsResult
        product={source}
        response={response(Array.from({ length: count }, (_, i) => item({ id: i + 50 })))}
        sort="UNIT_PRICE_ASC"
      />,
    );
    expect(screen.getByRole("heading", { name: `성분이 유사한 제품 ${count}개` })).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(count);
    if (count === 0) expect(screen.getByText("아직 비교할 유사템이 없어요")).toBeInTheDocument();
  });

  it("서버 순서와 추천 대상 구성품을 유지하고 단가·비율을 표시한다", () => {
    render(
      <SimilarProductsResult
        product={source}
        response={response([
          item({
            id: 22,
            partId: 202,
            name: "아주 긴 이름의 제품과 여러 구성품이 있는 유사템",
            unitPrice: 1100,
            unitPriceComparison: "MORE_EXPENSIVE",
            unitPriceDifferencePercent: 10,
          }),
          item({ id: 21, partId: 201 }),
        ])}
        sort="SIMILARITY"
      />,
    );
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/products/22?partId=202",
      "/products/21?partId=201",
    ]);
    expect(screen.getByText("ml당 1,100원")).toBeInTheDocument();
    expect(screen.getByText("10% 비쌈")).toBeInTheDocument();
    expect(screen.getByText("54% 저렴")).toBeInTheDocument();
    expect(screen.queryByText("주의 없음")).not.toBeInTheDocument();
  });

  it("비교 불가에는 비율을 쓰지 않고 같은 단가를 구분한다", () => {
    render(
      <SimilarProductsResult
        product={source}
        response={response([
          item({ id: 21, unitPrice: null, unitPriceComparison: "UNAVAILABLE", unitPriceDifferencePercent: null }),
          item({ id: 22, unitPriceComparison: "SAME", unitPriceDifferencePercent: 0 }),
        ])}
        sort="UNIT_PRICE_ASC"
      />,
    );
    expect(screen.getByText("단위 가격 정보 없음")).toBeInTheDocument();
    expect(screen.getByText("단위 가격 비교 불가")).toBeInTheDocument();
    expect(screen.getByText("단위 가격 동일")).toBeInTheDocument();
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  });

  it("정렬 전환은 기준 구성품을 URL에 남기고 스크롤을 유지한다", async () => {
    render(<SimilarProductsResult product={source} response={response([item()])} sort="UNIT_PRICE_ASC" />);
    await userEvent.click(screen.getByRole("button", { name: "성분 유사한 순" }));
    expect(router.replace).toHaveBeenCalledWith(
      `/similar-products/${source.id}?sort=SIMILARITY&partId=${source.selectedPart!.id}`,
      { scroll: false },
    );
  });

  it("실패해도 기준 제품을 남기고 다시 요청한다", async () => {
    render(<SimilarProductsResult product={source} response={null} sort="UNIT_PRICE_ASC" />);
    expect(screen.getByRole("region", { name: "기준 제품" })).toHaveTextContent(source.name);
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});

it("실패는 결과로 세지 않고 0건·가격 비교 가능 여부를 구분한다", () => {
  const view = render(<SimilarProductsResult product={source} response={null} sort="UNIT_PRICE_ASC" />);
  expect(track).not.toHaveBeenCalledWith("similar_results_viewed", expect.anything());
  view.rerender(<SimilarProductsResult product={source} response={response([])} sort="UNIT_PRICE_ASC" />);
  view.rerender(<SimilarProductsResult product={source} response={response([])} sort="UNIT_PRICE_ASC" />);
  expect(vi.mocked(track).mock.calls.filter(([event]) => event === "similar_results_viewed")).toHaveLength(1);
  expect(track).toHaveBeenCalledWith(
    "similar_results_viewed",
    expect.objectContaining({ result_count: 0, cheaper_count: 0, price_comparable_count: 0 }),
  );
});

it("상위 후보 안의 저렴한 제품과 가격 비교 불가를 나눈다", () => {
  render(
    <SimilarProductsResult
      product={source}
      response={response([item(), item({ id: 22, unitPriceComparison: "UNAVAILABLE", unitPrice: null })])}
      sort="UNIT_PRICE_ASC"
    />,
  );
  expect(track).toHaveBeenCalledWith(
    "similar_results_viewed",
    expect.objectContaining({ result_count: 2, cheaper_count: 1, price_comparable_count: 1 }),
  );
});
