/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, expect, it } from "vitest";

import { useProductPages } from "./useProductPages";

import { EMPTY_FILTER } from "@/lib/domain/filter";
import { STALE_MS } from "@/lib/storage/list-cache";
import { clearProductPages } from "@/lib/storage/product-pages-cache";
import { server } from "@/mocks/server";

const options = (id: number) => ({ brands: [{ id, name: `브랜드 ${id}` }], categories: [], skinTypes: [] });

beforeEach(() => clearProductPages());

it("후속 페이지의 생략은 유지하고 캐시 복원과 재조회는 첫 페이지 선택지를 사용한다", async () => {
  let brand = 1;
  const requests: number[] = [];
  server.use(
    http.get("*/api/products", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      requests.push(page);
      return HttpResponse.json({
        items: [],
        brands: [],
        categories: [],
        skinTypes: [],
        pagination: { page, size: 20, totalElements: 40, totalPages: 2, hasNext: page < 2 },
        ...(page === 1 ? { filterOptions: options(brand) } : {}),
      });
    }),
  );
  const first = renderHook(() => useProductPages(EMPTY_FILTER));
  await waitFor(() => expect(first.result.current.filterOptions).toEqual(options(1)));
  act(() => first.result.current.loadNext());
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  expect(first.result.current.filterOptions).toEqual(options(1));
  first.unmount();
  const restored = renderHook(() => useProductPages(EMPTY_FILTER));
  expect(restored.result.current.filterOptions).toEqual(options(1));
  expect(requests).toEqual([1, 2]);
  restored.unmount();
  brand = 2;
  const realNow = Date.now;
  Date.now = () => realNow() + STALE_MS + 1;
  try {
    const revalidated = renderHook(() => useProductPages(EMPTY_FILTER));
    await waitFor(() => expect(revalidated.result.current.filterOptions).toEqual(options(2)));
    revalidated.unmount();
  } finally {
    Date.now = realNow;
  }
});

it("앞쪽 첫 페이지를 붙이면 선택지가 생기고 빈 첫 페이지 응답은 이전 후보를 지운다", async () => {
  let empty = false;
  server.use(
    http.get("*/api/products", ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
      return HttpResponse.json({
        items: [],
        brands: [],
        categories: [],
        skinTypes: [],
        pagination: { page, size: 20, totalElements: 40, totalPages: 2, hasNext: page < 2 },
        ...(page === 1 ? { filterOptions: empty ? { brands: [], categories: [], skinTypes: [] } : options(1) } : {}),
      });
    }),
  );
  const filter = { ...EMPTY_FILTER, page: 2 };
  const first = renderHook(() => useProductPages(filter));
  await waitFor(() => expect(first.result.current.loaded).toBe(true));
  expect(first.result.current.filterOptions).toBeUndefined();
  act(() => first.result.current.loadPrevious());
  await waitFor(() => expect(first.result.current.filterOptions).toEqual(options(1)));
  first.unmount();
  empty = true;
  const realNow = Date.now;
  Date.now = () => realNow() + STALE_MS + 1;
  try {
    const again = renderHook(() => useProductPages(filter));
    await waitFor(() =>
      expect(again.result.current.filterOptions).toEqual({ brands: [], categories: [], skinTypes: [] }),
    );
    again.unmount();
  } finally {
    Date.now = realNow;
  }
});

it("조건이 바뀌면 이전 선택지를 지우고 늦은 응답도 섞지 않는다", async () => {
  server.use(
    http.get("*/api/products", async ({ request }) => {
      const old = new URL(request.url).searchParams.get("keyword") === "old";
      if (old) await delay(150);
      return HttpResponse.json({
        items: [],
        brands: [],
        categories: [],
        skinTypes: [],
        pagination: { page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
        filterOptions: old ? options(1) : { brands: [], categories: [], skinTypes: [] },
      });
    }),
  );
  const { result, rerender } = renderHook(({ keyword }) => useProductPages({ ...EMPTY_FILTER, keyword }), {
    initialProps: { keyword: "old" },
  });
  rerender({ keyword: "new" });
  expect(result.current.filterOptions).toBeUndefined();
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
  expect(result.current.filterOptions).toEqual({ brands: [], categories: [], skinTypes: [] });
});
