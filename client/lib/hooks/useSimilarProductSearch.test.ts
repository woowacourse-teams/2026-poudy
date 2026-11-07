/** @vitest-environment jsdom */
import type { ProductSuggestionPageResponse } from "@poudy/api/api.zod";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSimilarProductSearch } from "./useSimilarProductSearch";

const api = vi.hoisted(() => ({ fetchProductSuggestions: vi.fn() }));
vi.mock("@/lib/api/products", () => api);
const resultPage = (name: string): ProductSuggestionPageResponse => ({
  items: [
    {
      id: 1,
      name,
      brandName: "브랜드",
      imageUrl: "",
      marks: [],
      match: { field: "PRODUCT_NAME", text: name, startIndex: 0, endIndexExclusive: 1 },
    },
  ],
  pagination: { page: 1, size: 5, totalElements: 1, totalPages: 1, hasNext: false },
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("유사템 검색 요청", () => {
  it("한글 조합 중에는 요청하지 않고 입력이 멈춘 뒤 조회한다", async () => {
    vi.useFakeTimers();
    api.fetchProductSuggestions.mockResolvedValue(resultPage("완성된 제품"));
    const view = renderHook(({ composing }) => useSimilarProductSearch("조합검색", composing), {
      initialProps: { composing: true },
    });
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(api.fetchProductSuggestions).not.toHaveBeenCalled();
    view.rerender({ composing: false });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(api.fetchProductSuggestions).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(view.result.current.items[0]?.name).toBe("완성된 제품");
  });

  it("이전 응답이 늦게 도착해도 현재 결과를 덮어쓰지 않는다", async () => {
    let resolveOld: (value: ProductSuggestionPageResponse) => void = () => {};
    let resolveNew: (value: ProductSuggestionPageResponse) => void = () => {};
    api.fetchProductSuggestions.mockImplementation(
      (keyword: string) =>
        new Promise<ProductSuggestionPageResponse>((resolve) => {
          if (keyword === "이전검색") resolveOld = resolve;
          else resolveNew = resolve;
        }),
    );
    const view = renderHook(({ keyword }) => useSimilarProductSearch(keyword, false), {
      initialProps: { keyword: "이전검색" },
    });
    await waitFor(() => expect(api.fetchProductSuggestions).toHaveBeenCalledWith("이전검색", 5));
    view.rerender({ keyword: "현재검색" });
    expect(view.result.current.items).toEqual([]);
    await waitFor(() => expect(api.fetchProductSuggestions).toHaveBeenCalledWith("현재검색", 5));
    await act(async () => resolveNew(resultPage("현재 제품")));
    await act(async () => resolveOld(resultPage("이전 제품")));
    expect(view.result.current.items[0]?.name).toBe("현재 제품");
  });

  it("입력을 지운 후 도착한 응답은 빈 입력을 바꾸지 않는다", async () => {
    let resolveRequest: (value: ProductSuggestionPageResponse) => void = () => {};
    api.fetchProductSuggestions.mockReturnValue(
      new Promise<ProductSuggestionPageResponse>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const view = renderHook(({ keyword }) => useSimilarProductSearch(keyword, false), {
      initialProps: { keyword: "지우기검색" },
    });
    await waitFor(() => expect(api.fetchProductSuggestions).toHaveBeenCalled());
    view.rerender({ keyword: "" });
    await act(async () => resolveRequest(resultPage("늦은 제품")));
    expect(view.result.current.status).toBe("idle");
    expect(view.result.current.items).toEqual([]);
  });
});
