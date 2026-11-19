/** @vitest-environment jsdom */
import type { ProductSuggestionPageResponse, ShelfResponse } from "@poudy/api/api.zod";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SimilarProductsStart } from "./SimilarProductsStart";

import { ApiError } from "@/lib/api/client";
import { takeLoginReturn } from "@/lib/storage/login-return";
import { addRecentSearch, readRecentSearches, refreshRecentSearches } from "@/lib/storage/recent-searches";
import { popularDupesForEnvironment } from "@/mocks/popular-dupes";

const POPULAR_DUPES = popularDupesForEnvironment("staging");

const api = vi.hoisted(() => ({ fetchProductSuggestions: vi.fn(), fetchShelf: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/api/products", () => ({ fetchProductSuggestions: api.fetchProductSuggestions }));
vi.mock("@/lib/api/shelf", () => ({ fetchShelf: api.fetchShelf }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const suggestions: ProductSuggestionPageResponse = {
  items: Array.from({ length: 8 }, (_, index) => ({
    id: index + 50,
    name: `검색 제품 ${index}`,
    brandName: "검색 브랜드",
    imageUrl: "",
    marks: [],
    match: { field: "PRODUCT_NAME", text: `검색 제품 ${index}`, startIndex: 0, endIndexExclusive: 2 },
  })),
  pagination: { page: 1, size: 5, totalElements: 8, totalPages: 2, hasNext: true },
};
const shelf: ShelfResponse = {
  usages: [],
  items: [1, 2].map((id) => ({
    product: {
      id,
      name: `파우치 제품 ${id}`,
      brandName: "파우치 브랜드",
      imageUrl: "",
      marks: [],
      sensorySupported: false,
    },
    usageStatus: "IN_USE",
    rating: { preference: null, moistureLevel: null, oilLevel: null },
    possiblyUnsuitable: false,
    registeredAt: "2026-11-06T00:00:00Z",
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/similar-products");
  window.sessionStorage.clear();
  api.fetchShelf.mockResolvedValue({ usages: [], items: [] });
  api.fetchProductSuggestions.mockResolvedValue(suggestions);
  Element.prototype.scrollIntoView = vi.fn();
});

const startSearch = (keyword: string) => {
  const view = render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: keyword } });
  view.rerender(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
  return view;
};

describe("유사템 시작 화면", () => {
  it("한글 조합 중 입력을 그대로 유지하고 완성된 검색어만 주소와 요청에 반영한다", async () => {
    vi.useFakeTimers();
    const view = render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    try {
      const input = screen.getByRole("combobox");
      fireEvent.compositionStart(input);
      for (const value of ["ㄷ", "다", "닥", "닥ㅌ", "닥터", "닥터ㅈ", "닥터지"]) {
        fireEvent.change(input, { target: { value } });
        expect(input).toHaveValue(value);
      }
      await act(() => vi.advanceTimersByTimeAsync(500));
      expect(window.location.search).toBe("");
      expect(api.fetchProductSuggestions).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input, { data: "닥터지" });
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(api.fetchProductSuggestions).toHaveBeenCalledWith("닥터지", 5);
      expect(new URLSearchParams(window.location.search).get("q")).toBe("닥터지");
      expect(input).toHaveValue("닥터지");
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });
  it("입력 아래 최대 5개를 표시하고 Enter만으로 다른 검색 화면을 열지 않는다", async () => {
    startSearch("최대후보검색");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(5);
    expect(api.fetchProductSuggestions).toHaveBeenCalledWith("최대후보검색", 5);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{Enter}");
    expect(router.push).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(router.push).toHaveBeenCalledWith("/similar-products/50?sort=UNIT_PRICE_ASC");
  });

  it("돌아오면 검색어 주소와 받은 후보를 바로 복원한다", async () => {
    const view = startSearch("복원검색");
    await screen.findAllByRole("option");
    view.unmount();
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    expect(screen.getByRole("combobox")).toHaveValue("복원검색");
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("입력을 지우면 후보도 지운다", async () => {
    const view = startSearch("입력삭제검색");
    await screen.findAllByRole("option");
    await userEvent.click(screen.getByRole("button", { name: "검색어 지우기" }));
    view.rerender(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("검색 실패를 재시도하고 빈 결과를 구분한다", async () => {
    api.fetchProductSuggestions
      .mockRejectedValueOnce(new Error("실패"))
      .mockResolvedValue({ ...suggestions, items: [] });
    startSearch("실패검색");
    await userEvent.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("검색한 제품이 없어요")).toBeInTheDocument();
  });

  it("파우치 실패 중에도 저렴이를 보여 주고 파우치만 재시도한다", async () => {
    api.fetchShelf.mockRejectedValueOnce(new Error("실패")).mockResolvedValue(shelf);
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    expect(await screen.findByText("내 파우치를 불러오지 못했어요", { selector: "p" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "요즘 많이 찾는 저렴이" })).getAllByRole("link")).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: /파우치 제품 1/ })).toHaveAttribute(
      "href",
      "/similar-products/1?sort=UNIT_PRICE_ASC",
    );
  });

  it("입력하는 동안에는 검색 결과만 보여 준다", async () => {
    api.fetchShelf.mockResolvedValue(shelf);
    startSearch("결과만검색");
    await screen.findAllByRole("option");
    expect(screen.queryByRole("region", { name: "요즘 많이 찾는 저렴이" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "내 파우치 제품으로 찾기" })).not.toBeInTheDocument();
  });

  it("파우치 제품은 최대 10개를 홈 제품 카드로 보여 주고 전체 시트는 두지 않는다", async () => {
    api.fetchShelf.mockResolvedValue({
      ...shelf,
      items: Array.from({ length: 12 }, (_, index) => ({
        ...shelf.items[0]!,
        product: { ...shelf.items[0]!.product, id: index + 1, name: `파우치 제품 ${index + 1}` },
      })),
    });
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    const section = within(await screen.findByRole("region", { name: "내 파우치 제품으로 찾기" }));
    expect(await section.findAllByRole("link")).toHaveLength(10);
    expect(section.getByRole("link", { name: /파우치 제품 2$/ })).toHaveAttribute(
      "href",
      "/similar-products/2?sort=UNIT_PRICE_ASC",
    );
    expect(screen.queryByRole("button", { name: "전체" })).not.toBeInTheDocument();
  });

  it("빈 파우치는 파우치로 가는 링크 하나만 둔다", async () => {
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    expect(await screen.findByText("파우치에 담은 제품이 없어요")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "파우치로 가기" })).toHaveAttribute("href", "/pouch");
  });

  it("입력칸을 누르면 다른 섹션을 접고 최근 검색만 보여 주며, 고른 말로 다시 검색한다", async () => {
    window.localStorage.clear();
    refreshRecentSearches();
    addRecentSearch({ kind: "keyword", keyword: "독도" });
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    await screen.findByText("파우치에 담은 제품이 없어요");
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("heading", { name: "최근 검색" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "요즘 많이 찾는 저렴이" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "내 파우치 제품으로 찾기" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "독도" }));
    expect(screen.getByRole("combobox")).toHaveValue("독도");
    expect(screen.getByRole("combobox")).toHaveFocus();
    expect(await screen.findAllByRole("option")).toHaveLength(5);
    expect(screen.queryByRole("heading", { name: "최근 검색" })).not.toBeInTheDocument();
  });

  it("입력이 비고 포커스가 빠지면 접은 섹션을 다시 펼친다", async () => {
    window.localStorage.clear();
    refreshRecentSearches();
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("region", { name: "요즘 많이 찾는 저렴이" })).not.toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole("combobox")).not.toHaveFocus();
    expect(screen.getByRole("region", { name: "요즘 많이 찾는 저렴이" })).toBeInTheDocument();
  });

  it("제품을 고르면 검색어를 제품명 검색과 같은 최근 검색에 남긴다", async () => {
    window.localStorage.clear();
    refreshRecentSearches();
    startSearch("기록검색");
    await userEvent.click((await screen.findAllByRole("option"))[1]!);
    expect(readRecentSearches()).toEqual([{ kind: "keyword", keyword: "기록검색" }]);
    expect(router.push).toHaveBeenCalledWith("/similar-products/51?sort=UNIT_PRICE_ASC");
  });

  it("로그인 전에는 파우치 자리에서 로그인을 안내하고 지금 주소를 로그인 복귀 주소에 남긴다", async () => {
    api.fetchShelf.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "로그인 필요"));
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    expect(await screen.findByText("로그인하고 내 제품으로 찾아보세요")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(router.push).toHaveBeenCalledWith("/login");
    expect(takeLoginReturn()).toBe("/similar-products");
  });

  it("비로그인 상태에서도 저렴이 예시 3개와 기준 구성품의 결과 링크를 보여 준다", async () => {
    api.fetchShelf.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "로그인 필요"));
    render(<SimilarProductsStart popularDupes={POPULAR_DUPES} />);
    await screen.findByRole("button", { name: "로그인" });
    const popular = within(screen.getByRole("region", { name: "요즘 많이 찾는 저렴이" }));
    expect(popular.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/similar-products/873?sort=UNIT_PRICE_ASC&partId=767",
      "/similar-products/2115?sort=UNIT_PRICE_ASC&partId=2070",
      "/similar-products/1838?sort=UNIT_PRICE_ASC&partId=1832",
    ]);
    expect(popular.getAllByRole("link")[0]).toHaveTextContent("50% 저렴ea당 2,000원기준 제품 4,000원");
  });
});
