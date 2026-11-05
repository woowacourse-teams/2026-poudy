/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useCountState } from "./useProductCount";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";
import { server } from "@/mocks/server";

const withBrand = (id: number): Filter => ({ ...EMPTY_FILTER, brandIds: [id] });

/** 브랜드마다 응답 시간과 개수를 정한다. 개수는 브랜드 ID 와 같다. */
const answerAfter = (delays: Readonly<Record<string, number>>) =>
  server.use(
    http.get("*/api/products/count", async ({ request }) => {
      const brand = new URL(request.url).searchParams.get("brandIds") ?? "0";
      await delay(delays[brand] ?? 0);
      return HttpResponse.json({ count: Number(brand) });
    }),
  );

const stepPastDebounce = () => new Promise((resolve) => setTimeout(resolve, 320));

describe("useCountState 의 요청 순서", () => {
  it("먼저 보낸 요청이 늦게 도착해도 마지막 조건의 개수를 덮어쓰지 않는다", async () => {
    answerAfter({ 1: 500, 2: 0 });
    const { result, rerender } = renderHook(({ filter }) => useCountState(filter), {
      initialProps: { filter: withBrand(1) },
    });

    // 1 번 요청이 나간 뒤에 조건을 바꾼다.
    await act(stepPastDebounce);
    rerender({ filter: withBrand(2) });
    await waitFor(() => expect(result.current).toEqual({ count: 2, counting: false }), { timeout: 1500 });

    // 1 번 응답이 도착할 시간을 넘겨도 그대로다.
    await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
    expect(result.current).toEqual({ count: 2, counting: false });
  });

  it("앞선 응답이 먼저 와도 마지막 조건의 응답을 받기 전에는 세는 중으로 둔다", async () => {
    answerAfter({ 1: 100, 2: 500 });
    const { result, rerender } = renderHook(({ filter }) => useCountState(filter), {
      initialProps: { filter: withBrand(1) },
    });

    await act(stepPastDebounce);
    rerender({ filter: withBrand(2) });
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    expect(result.current.counting).toBe(true);

    await waitFor(() => expect(result.current).toEqual({ count: 2, counting: false }), { timeout: 1500 });
  });

  it("빠르게 여러 번 바꾸면 처음 조건 뒤로는 마지막 조건만 요청한다", async () => {
    const requested: string[] = [];
    server.use(
      http.get("*/api/products/count", ({ request }) => {
        requested.push(new URL(request.url).searchParams.get("brandIds") ?? "");
        return HttpResponse.json({ count: 9 });
      }),
    );
    const { result, rerender } = renderHook(({ filter }) => useCountState(filter), {
      initialProps: { filter: withBrand(1) },
    });

    rerender({ filter: withBrand(2) });
    rerender({ filter: withBrand(3) });
    rerender({ filter: withBrand(4) });

    await waitFor(() => expect(result.current.counting).toBe(false), { timeout: 1500 });
    // 처음 조건은 시트를 열 때 바로 센다. 그 뒤로 300ms 안에 바꾼 조건은 건너뛴다.
    expect(requested).toEqual(["1", "4"]);
  });

  it("요청이 실패하면 세기를 끝내고 개수를 비운다", async () => {
    server.use(http.get("*/api/products/count", () => HttpResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 })));
    const { result } = renderHook(() => useCountState(withBrand(1), 5));

    await waitFor(() => expect(result.current).toEqual({ count: undefined, counting: false }), { timeout: 1500 });
  });
});
