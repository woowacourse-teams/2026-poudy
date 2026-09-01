/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useProductSuggestions } from "@/lib/hooks/useProductSuggestions";
import { clearSuggestionPages } from "@/lib/storage/suggestion-pages-cache";
import { server } from "@/mocks/server";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

/** 장마다 두 건씩 돌려주고 몇 번 불렸는지 센다. */
const countingSuggestions = () => {
  const pages: number[] = [];

  server.use(
    http.get("*/api/products/suggestions", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
      pages.push(page);

      return HttpResponse.json({
        items: [page * 2 + 1, page * 2 + 2].map((id) => ({
          id,
          name: `제품 ${id}`,
          imageUrl: "",
          brandName: "브랜드",
          match: { field: "PRODUCT_NAME", text: `제품 ${id}`, startIndex: 0, endIndexExclusive: 2 },
        })),
        pagination: { page, size: 2, totalElements: 6, totalPages: 3, hasNext: page < 2 },
      });
    }),
  );

  return pages;
};

const scrollTo = vi.fn();

beforeEach(() => {
  clearSuggestionPages();
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  document.elementFromPoint = () => null;
});

describe("useProductSuggestions", () => {
  it("장을 이어 붙인다", async () => {
    countingSuggestions();
    const { result } = renderHook(() => useProductSuggestions("독도"));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.loadNext());
    await waitFor(() => expect(result.current.items).toHaveLength(4));

    expect(result.current.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("떠났다 돌아오면 이어 붙인 결과를 그대로 되살리고 다시 부르지 않는다", async () => {
    const pages = countingSuggestions();
    const first = renderHook(() => useProductSuggestions("독도"));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    act(() => first.result.current.loadNext());
    await waitFor(() => expect(first.result.current.items).toHaveLength(4));
    first.unmount();

    const called = pages.length;
    const again = renderHook(() => useProductSuggestions("독도"));

    // 첫 그리기부터 결과가 있어야 문서 높이가 살아 보던 자리로 되돌릴 수 있다.
    expect(again.result.current.items).toHaveLength(4);
    expect(again.result.current.total).toBe(6);
    expect(pages).toHaveLength(called);
  });

  it("되살린 검색어의 보던 자리로 되돌린다", async () => {
    countingSuggestions();
    const first = renderHook(() => useProductSuggestions("독도"));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    Object.defineProperty(window, "scrollY", { value: 480, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    first.unmount();

    renderHook(() => useProductSuggestions("독도"));

    expect(scrollTo).toHaveBeenCalledWith(0, 480);
  });

  it("오래된 결과는 되살린 뒤 쌓아 둔 장을 전부 다시 받는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pages = countingSuggestions();
    const first = renderHook(() => useProductSuggestions("독도"));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    act(() => first.result.current.loadNext());
    await waitFor(() => expect(first.result.current.items).toHaveLength(4));
    first.unmount();

    pages.length = 0;
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);

    const again = renderHook(() => useProductSuggestions("독도"));

    // 받는 동안에도 담아 둔 결과를 보여 준다.
    expect(again.result.current.items).toHaveLength(4);

    await waitFor(() => expect(again.result.current.revalidating).toBe(false));
    expect(pages).toEqual([0, 1]);
    expect(again.result.current.items).toHaveLength(4);
    vi.useRealTimers();
  });

  it("검색어가 바뀌면 처음부터 다시 받는다", async () => {
    const pages = countingSuggestions();
    const { result, rerender } = renderHook(({ keyword }) => useProductSuggestions(keyword), {
      initialProps: { keyword: "독도" },
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.loadNext());
    await waitFor(() => expect(result.current.items).toHaveLength(4));

    rerender({ keyword: "수분" });

    await waitFor(() => expect(result.current.keyword).toBe("수분"));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(pages.at(-1)).toBe(0);
  });

  it("검색어가 비면 아무것도 부르지 않는다", async () => {
    const pages = countingSuggestions();
    const { result } = renderHook(() => useProductSuggestions("   "));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(0);
    expect(pages).toHaveLength(0);
  });
});
