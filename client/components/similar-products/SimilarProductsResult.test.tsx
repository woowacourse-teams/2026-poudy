/** @vitest-environment jsdom */
import type { SimilarProductResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimilarProductsResult } from "./SimilarProductsResult";

import { track } from "@/lib/analytics/track";
import type { ProductSimilarityWithGroups, SimilarProductWithGroups } from "@/lib/api/products";
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
const response = (items: SimilarProductWithGroups[]): ProductSimilarityWithGroups => ({
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
    expect(screen.getByText("기준 제품 · 02 구성품")).toBeInTheDocument();
  });
  it.each([1, 9, 10])("후보 %i개를 제목과 목록에 맞게 표시한다", (count) => {
    render(
      <SimilarProductsResult
        product={source}
        response={response(Array.from({ length: count }, (_, i) => item({ id: i + 50 })))}
        sort="UNIT_PRICE_ASC"
      />,
    );
    expect(screen.getByRole("heading", { name: /성분이 유사한 제품/ })).toHaveTextContent(`${count}개`);
    expect(screen.queryAllByRole("listitem")).toHaveLength(count);
  });

  it("후보가 없으면 개수·정렬·각주 없이 다른 제품 찾기만 둔다", () => {
    render(<SimilarProductsResult product={source} response={response([])} sort="UNIT_PRICE_ASC" />);
    expect(screen.getByText("아직 비교할 유사템이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "다른 제품 찾기" })).toHaveAttribute("href", "/similar-products");
    expect(screen.queryByRole("heading", { name: /성분이 유사한 제품/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "저렴한 순" })).not.toBeInTheDocument();
    expect(screen.queryByText(/상위 10개/)).not.toBeInTheDocument();
  });

  it("실패해도 개수·정렬·각주를 그리지 않는다", () => {
    render(<SimilarProductsResult product={source} response={null} sort="UNIT_PRICE_ASC" />);
    expect(screen.queryByRole("button", { name: "저렴한 순" })).not.toBeInTheDocument();
    expect(screen.queryByText(/상위 10개/)).not.toBeInTheDocument();
  });

  it("저렴한 순은 절약률·단가·취소선 기준 단가를 쓰고 각주는 상위 10개 안에서 비교한다고 적는다", () => {
    render(<SimilarProductsResult product={source} response={response([item()])} sort="UNIT_PRICE_ASC" />);
    const row = screen.getByRole("link");
    expect(row).toHaveTextContent("54%");
    expect(row).toHaveTextContent("ml당 460원");
    // 기준 제품 대표 용량 200ml · 18,000원의 단가
    expect(row.querySelector("s")).toHaveTextContent("90원");
    expect(screen.getByText(/성분이 비슷한 상위 10개 안에서 비교해요/)).toBeInTheDocument();
  });

  it("성분 유사한 순은 겹치는 성분을 보여 주고, 서버가 주지 않으면 그 줄을 그리지 않는다", () => {
    render(
      <SimilarProductsResult
        product={source}
        response={response([
          { ...item({ id: 21 }), sharedIngredientGroups: [{ name: "히알루론산" }, { name: "판테놀" }] },
          item({ id: 22 }),
        ])}
        sort="SIMILARITY"
      />,
    );
    const [first, second] = screen.getAllByRole("link");
    expect(first).toHaveTextContent("겹치는 성분히알루론산판테놀");
    expect(second).not.toHaveTextContent("겹치는 성분");
    expect(screen.getByText(/성분이 비슷한 상위 10개를 보여 줘요/)).toBeInTheDocument();
  });

  it("주의 성분이나 나만의 필터 성분이 든 행에만 주의 칩을 붙인다", () => {
    render(
      <SimilarProductsResult
        product={source}
        response={response([
          item({ id: 21, containsExcludedIngredient: true }),
          item({ id: 22, containsExcludedIngredient: false }),
          item({ id: 23, containsExcludedIngredient: false }),
        ])}
        sort="UNIT_PRICE_ASC"
        myFilterProductIds={[23]}
      />,
    );
    const rows = screen.getAllByRole("link");
    expect(rows.map((row) => row.textContent?.includes("주의 있음"))).toEqual([true, false, true]);
    expect(screen.queryByText("주의 없음")).not.toBeInTheDocument();
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
          item({ id: 23, unitPrice: 240, unitPriceComparison: "UNAVAILABLE", unitPriceDifferencePercent: null }),
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
