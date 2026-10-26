/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, expect, it } from "vitest";

import { useProductPages } from "./useProductPages";

import { EMPTY_FILTER } from "@/lib/domain/filter";
import { STALE_MS } from "@/lib/storage/list-cache";
import { clearProductPages, productPagesKey } from "@/lib/storage/product-pages-cache";
import { products } from "@/mocks/fixtures";
import { server } from "@/mocks/server";

const options = (id: number) => ({
  brands: [{ id, name: `브랜드 ${id}`, englishName: `Brand ${id}`, imageUrl: "" }],
  categories: [],
  skinTypes: [],
  sensitiveSkin: true,
  attributes: [],
});

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
        pagination: { page, size: 20, totalElements: 40, totalPages: 2, hasNext: page < 2 },
        ...(page === 1
          ? {
              filterOptions: empty
                ? { brands: [], categories: [], skinTypes: [], sensitiveSkin: false, attributes: [] }
                : options(1),
            }
          : {}),
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
      expect(again.result.current.filterOptions).toEqual({
        brands: [],
        categories: [],
        skinTypes: [],
        sensitiveSkin: false,
        attributes: [],
      }),
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
        pagination: { page: 1, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
        filterOptions: old
          ? options(1)
          : { brands: [], categories: [], skinTypes: [], sensitiveSkin: false, attributes: [] },
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
  expect(result.current.filterOptions).toEqual({
    brands: [],
    categories: [],
    skinTypes: [],
    sensitiveSkin: false,
    attributes: [],
  });
});

it("나만의 필터 결과는 복원 캐시에 남기지 않고 다시 진입하면 최신 결과를 받는다", async () => {
  let total = 1;
  const requested: URL[] = [];
  server.use(
    http.get("*/api/products", ({ request }) => {
      requested.push(new URL(request.url));
      return HttpResponse.json({
        items: [],
        brands: [],
        pagination: { page: 1, size: 20, totalElements: total, totalPages: 1, hasNext: false },
      });
    }),
  );
  const filter = { ...EMPTY_FILTER, myFilter: true };
  const first = renderHook(() => useProductPages(filter));
  await waitFor(() => expect(first.result.current.total).toBe(1));
  first.unmount();
  total = 2;
  const second = renderHook(() => useProductPages(filter));
  expect(second.result.current.restored).toBe(false);
  await waitFor(() => expect(second.result.current.total).toBe(2));
  expect(requested).toHaveLength(2);
  expect(requested.every((url) => url.searchParams.get("myFilter") === "true")).toBe(true);
  second.unmount();
});

it("나만의 필터 편집 후 뒤로가기로 복원한 서버 첫 장도 최신 결과로 다시 확인한다", async () => {
  const filter = { ...EMPTY_FILTER, myFilter: true };
  const response = {
    items: [],
    brands: [],
    pagination: { page: 1, size: 20, totalElements: 1, totalPages: 1, hasNext: false },
  };
  const initial = { key: productPagesKey(filter), response };
  let total = 2;
  server.use(
    http.get("*/api/products", () =>
      HttpResponse.json({
        ...response,
        pagination: { ...response.pagination, totalElements: total },
      }),
    ),
  );
  const first = renderHook(() => useProductPages(filter, initial));
  await waitFor(() => expect(first.result.current.total).toBe(2));
  first.unmount();
  total = 3;
  // App Router가 이전 방문의 RSC와 같은 seed를 복원한다.
  const restored = renderHook(() => useProductPages(filter, initial));
  await waitFor(() => expect(restored.result.current.total).toBe(3));
  restored.unmount();
});

it.each(["revalidate", "next", "previous"] as const)(
  "%s 요청에서 인증이 만료되면 개인 목록을 버리고 재시도는 시작한 장부터 조회한다",
  async (direction) => {
    const filter = { ...EMPTY_FILTER, myFilter: true, page: 2 };
    const response = {
      items: [products[0]],
      brands: [],
      filterOptions: options(1),
      pagination: { page: 2, size: 20, totalElements: 42, totalPages: 3, hasNext: true },
    };
    const initial = { key: productPagesKey(filter), response };
    let expired = direction === "revalidate";
    const requestedPages: number[] = [];
    server.use(
      http.get("*/api/products", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        requestedPages.push(page);
        if (expired) return HttpResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
        return HttpResponse.json({ ...response, pagination: { ...response.pagination, page } });
      }),
    );
    const view = renderHook(() => useProductPages(filter, initial));
    if (direction !== "revalidate") {
      await waitFor(() => expect(view.result.current.revalidating).toBe(false));
      expired = true;
      act(() => {
        if (direction === "next") view.result.current.loadNext();
        else view.result.current.loadPrevious();
      });
    }
    await waitFor(() => expect(view.result.current.failed).toBe(true));
    expect(view.result.current).toMatchObject({
      loaded: false,
      loading: false,
      revalidating: false,
      items: [],
      total: 0,
      hasNext: false,
      page: 2,
      first: 2,
    });
    expect(view.result.current.filterOptions).toBeUndefined();
    expect(view.result.current.pendingPage).toBeUndefined();
    expect(view.result.current.pendingPreviousPage).toBeUndefined();
    expired = false;
    act(() => view.result.current.retry());
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    expect(requestedPages.at(-1)).toBe(2);
    expect(view.result.current.items).toEqual(response.items);
    view.unmount();
  },
);

it("개인 목록 재검증의 일반 서버 오류는 기존 결과를 유지한다", async () => {
  const filter = { ...EMPTY_FILTER, myFilter: true };
  const response = {
    items: [products[0]],
    brands: [],
    filterOptions: options(1),
    pagination: { page: 1, size: 20, totalElements: 42, totalPages: 3, hasNext: true },
  };
  server.use(http.get("*/api/products", () => HttpResponse.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 })));
  const view = renderHook(() => useProductPages(filter, { key: productPagesKey(filter), response }));
  await waitFor(() => expect(view.result.current.revalidating).toBe(false));
  expect(view.result.current).toMatchObject({ loaded: true, failed: false, total: 42, items: response.items });
  view.unmount();
});

it("나만의 필터를 켠 채 세션이 끝나면 목록을 비우고 로그인이 필요하다고 알린다", async () => {
  server.use(
    http.get("*/api/products", () =>
      HttpResponse.json({ status: 401, code: "UNAUTHORIZED", detail: "로그인이 필요합니다." }, { status: 401 }),
    ),
  );
  const { result, unmount } = renderHook(() => useProductPages({ ...EMPTY_FILTER, myFilter: true }));
  await waitFor(() => expect(result.current.signedOut).toBe(true));
  expect(result.current.items).toEqual([]);
  expect(result.current.failed).toBe(true);
  unmount();
});
