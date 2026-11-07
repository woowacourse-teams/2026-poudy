/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useInsertionEffect, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useRoutinePages } from "./useRoutinePages";

import { ApiError } from "@/lib/api/client";
import { createListCache } from "@/lib/storage/list-cache";
import type { RoutinePages } from "@/lib/storage/routine-pages-cache";

type Item = { readonly id: number };
let entry: string;
const scrollTo = vi.fn((_: number, y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
});
const pageOf = (page: number): RoutinePages<Item> => ({
  items: [{ id: page }],
  page,
  total: 3,
  hasNext: page < 3,
});
const setup = () => {
  const cache = createListCache<RoutinePages<Item>>(5);
  const loadPage = vi.fn(async (page: number) => pageOf(page));
  return { cache, loadPage, path: "/routines/feed?sort=LIKES" };
};
const ready = async (result: { readonly current: ReturnType<typeof useRoutinePages<Item>> }) => {
  await waitFor(() => {
    expect(result.current.state.status).toBe("ready");
    if (result.current.state.status === "ready") expect(result.current.state.revalidating).toBe(false);
  });
};
beforeEach(() => {
  entry = "visit-a";
  Object.defineProperty(window, "navigation", { configurable: true, get: () => ({ currentEntry: { key: entry } }) });
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  document.elementFromPoint = () => null;
  scrollTo.mockClear();
});

describe("루틴 목록 방문 기록", () => {
  it("라우터가 렌더 뒤 갱신한 방문 기록에 목록과 위치를 저장한다", async () => {
    const options = setup();
    function RouteCommit({ children }: PropsWithChildren) {
      useInsertionEffect(() => {
        entry = "committed";
      }, []);
      return children;
    }
    const first = renderHook(() => useRoutinePages(options), { wrapper: RouteCommit });
    await ready(first.result);
    await act(() => first.result.current.loadMore());
    window.scrollTo(0, 850);
    first.unmount();
    expect(options.cache.read(`${options.path}:committed`)).toMatchObject({
      page: 2,
      entry: "committed",
      position: { scrollY: 850 },
    });
    const back = renderHook(() => useRoutinePages(options));
    await ready(back.result);
    expect(back.result.current.state).toMatchObject({ data: { page: 2 } });
    back.unmount();
  });

  it("상세에서 돌아오면 이어 붙인 페이지와 스크롤을 복원한다", async () => {
    const options = setup();
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    await act(() => first.result.current.loadMore());
    window.scrollTo(0, 850);
    first.unmount();
    scrollTo.mockClear();
    const back = renderHook(() => useRoutinePages(options));
    expect(back.result.current.state).toMatchObject({ status: "ready", data: { items: [{ id: 1 }, { id: 2 }] } });
    expect(scrollTo).toHaveBeenCalledWith(0, 850);
    await ready(back.result);
    expect(options.loadPage.mock.calls.map(([page]) => page)).toEqual([1, 2, 1, 2]);
    back.unmount();
  });

  it("같은 URL을 새 링크로 열면 첫 페이지와 맨 위에서 시작한다", async () => {
    const options = setup();
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    await act(() => first.result.current.loadMore());
    window.scrollTo(0, 850);
    first.unmount();
    entry = "visit-b";
    scrollTo.mockClear();
    const next = renderHook(() => useRoutinePages(options));
    await ready(next.result);
    expect(next.result.current.state).toMatchObject({ data: { page: 1, items: [{ id: 1 }] } });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    next.unmount();
  });

  it("내 루틴 항목은 저장하지 않고 이전 페이지를 다시 받은 뒤 위치를 복원한다", async () => {
    const options = { ...setup(), reuseItems: false };
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    await act(() => first.result.current.loadMore());
    window.scrollTo(0, 850);
    first.unmount();
    expect(options.cache.read(`${options.path}:visit-a`)?.items).toEqual([]);
    scrollTo.mockClear();
    const back = renderHook(() => useRoutinePages(options));
    expect(back.result.current.state.status).toBe("loading");
    expect(scrollTo).not.toHaveBeenCalled();
    await ready(back.result);
    expect(back.result.current.state).toMatchObject({ data: { items: [{ id: 1 }, { id: 2 }] } });
    expect(scrollTo).toHaveBeenCalledWith(0, 850);
    back.unmount();
  });

  it("연속으로 다음 페이지를 요청해도 한 번만 받고 중복 항목은 제외한다", async () => {
    const options = setup();
    options.loadPage.mockImplementation(async (page) => ({
      ...pageOf(page),
      items: page === 1 ? [{ id: 1 }] : [{ id: 1 }, { id: page }],
    }));
    const hook = renderHook(() => useRoutinePages(options));
    await ready(hook.result);
    await act(async () => {
      await Promise.all([hook.result.current.loadMore(), hook.result.current.loadMore()]);
    });
    expect(options.loadPage.mock.calls.map(([page]) => page)).toEqual([1, 2]);
    expect(hook.result.current.state).toMatchObject({ data: { page: 2, items: [{ id: 1 }, { id: 2 }] } });
    hook.unmount();
  });

  it("공개 목록 갱신이 실패해도 되살린 페이지를 유지한다", async () => {
    const options = setup();
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    first.unmount();
    options.loadPage.mockRejectedValue(new Error("offline"));
    const back = renderHook(() => useRoutinePages(options));
    await ready(back.result);
    expect(back.result.current.state).toMatchObject({ data: { items: [{ id: 1 }] } });
    back.unmount();
  });

  it("로그아웃한 상태로 내 루틴에 돌아오면 개인 목록을 표시하지 않는다", async () => {
    const options = { ...setup(), reuseItems: false };
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    first.unmount();
    options.loadPage.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다"));
    const back = renderHook(() => useRoutinePages(options));
    await waitFor(() => expect(back.result.current.state.status).toBe("signedOut"));
    expect(options.cache.read(`${options.path}:visit-a`)).toBeUndefined();
    back.unmount();
  });

  it("공개 목록 갱신 도중 사용자가 스크롤하면 이전 위치로 다시 끌어오지 않는다", async () => {
    const options = setup();
    const first = renderHook(() => useRoutinePages(options));
    await ready(first.result);
    window.scrollTo(0, 850);
    first.unmount();
    let resolve!: (value: RoutinePages<Item>) => void;
    options.loadPage.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const back = renderHook(() => useRoutinePages(options));
    window.scrollTo(0, 1200);
    scrollTo.mockClear();
    await act(async () => resolve(pageOf(1)));
    expect(scrollTo).not.toHaveBeenCalled();
    back.unmount();
  });
});
