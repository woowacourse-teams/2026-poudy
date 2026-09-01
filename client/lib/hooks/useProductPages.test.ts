/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { useProductPages } from "@/lib/hooks/useProductPages";
import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { server } from "@/mocks/server";

/** 장마다 두 건씩 돌려주고 몇 번 불렸는지 센다. */
const countingProducts = () => {
  const pages: number[] = [];

  server.use(
    http.get("*/api/products", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 0);
      pages.push(page);

      return HttpResponse.json({
        items: [{ id: page * 2 + 1 }, { id: page * 2 + 2 }],
        pagination: { page, size: 2, totalElements: 6, totalPages: 3, hasNext: page < 2 },
        brands: [],
      });
    }),
  );

  return pages;
};

const scrollTo = vi.fn();

beforeEach(() => {
  clearProductPages();
  scrollTo.mockClear();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  // jsdom 에 없다. 항목을 못 찾은 셈이므로 픽셀값으로 되돌아간다.
  document.elementFromPoint = () => null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const filterOf = (keyword: string): Filter => ({ ...EMPTY_FILTER, keyword });

describe("useProductPages", () => {
  it("장을 이어 붙인다", async () => {
    countingProducts();
    const { result } = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.loadNext());
    await waitFor(() => expect(result.current.items).toHaveLength(4));

    expect(result.current.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
    expect(result.current.page).toBe(1);
  });

  it("떠났다 돌아오면 이어 붙인 목록을 그대로 되살리고 다시 부르지 않는다", async () => {
    const pages = countingProducts();
    const first = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    act(() => first.result.current.loadNext());
    await waitFor(() => expect(first.result.current.items).toHaveLength(4));
    first.unmount();

    const called = pages.length;
    const again = renderHook(() => useProductPages(filterOf("a")));

    // 첫 그리기부터 목록이 있어야 문서 높이가 살아 스크롤을 되돌릴 수 있다.
    expect(again.result.current.items).toHaveLength(4);
    expect(again.result.current.page).toBe(1);
    expect(again.result.current.loading).toBe(false);
    expect(pages).toHaveLength(called);
  });

  it("되살린 뒤에도 다음 장을 이어 받는다", async () => {
    countingProducts();
    const first = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    first.unmount();

    const again = renderHook(() => useProductPages(filterOf("a")));
    act(() => again.result.current.loadNext());

    await waitFor(() => expect(again.result.current.items).toHaveLength(4));
    expect(again.result.current.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it("조건이 바뀌면 맨 위에서 새로 받는다", async () => {
    const pages = countingProducts();
    const { result, rerender } = renderHook(({ keyword }) => useProductPages(filterOf(keyword)), {
      initialProps: { keyword: "a" },
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.loadNext());
    await waitFor(() => expect(result.current.items).toHaveLength(4));

    rerender({ keyword: "b" });

    await waitFor(() => expect(result.current.page).toBe(0));
    expect(pages.at(-1)).toBe(0);
  });

  it("되살린 조건의 스크롤 위치를 되돌린다", async () => {
    countingProducts();
    const first = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    Object.defineProperty(window, "scrollY", { value: 640, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    first.unmount();

    renderHook(() => useProductPages(filterOf("a")));

    expect(scrollTo).toHaveBeenCalledWith(0, 640);
  });

  it("오래된 목록은 되살린 뒤 쌓아 둔 장을 전부 다시 받는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pages = countingProducts();
    const first = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    act(() => first.result.current.loadNext());
    await waitFor(() => expect(first.result.current.items).toHaveLength(4));
    first.unmount();

    pages.length = 0;
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);

    const again = renderHook(() => useProductPages(filterOf("a")));

    // 첫 그리기에는 담아 둔 목록이 그대로 있어야 문서 높이가 살아 있다.
    expect(again.result.current.items).toHaveLength(4);

    await waitFor(() => expect(again.result.current.revalidating).toBe(false));
    expect(pages).toEqual([0, 1]);
    expect(again.result.current.items).toHaveLength(4);
    vi.useRealTimers();
  });

  it("처음 보는 조건에서는 스크롤을 건드리지 않는다", async () => {
    countingProducts();
    const { result } = renderHook(() => useProductPages(filterOf("a")));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
