/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerReplace, searchParams } = vi.hoisted(() => ({
  routerReplace: vi.fn(),
  searchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace, push: vi.fn() }),
  useSearchParams: () => searchParams.current,
}));

import { useFilterQuery } from "./useFilterQuery";

const query = () => new URL(window.location.href).searchParams;

describe("useFilterQuery", () => {
  beforeEach(() => {
    searchParams.current = new URLSearchParams();
    routerReplace.mockClear();
    window.history.replaceState(null, "", "/search/ingredients");
  });

  it("조건을 바꾸면 주소에 담는다", () => {
    const { result } = renderHook(() => useFilterQuery("/search/ingredients"));

    act(() => result.current.setCondition({ includeIngredientIds: [6] }));

    expect(query().get("includeIngredientIds")).toBe("6");
  });

  /*
   * 서버를 다녀오면 그 응답이 와야 searchParams 가 바뀐다. 조건에서 값을 읽는 버튼은
   * 그때까지 눌리지 않은 모양으로 남아 멈춘 것처럼 보인다.
   */
  it("조건을 바꿀 때 서버를 부르지 않는다", () => {
    const { result } = renderHook(() => useFilterQuery("/search/ingredients"));

    act(() => result.current.setCondition({ includeIngredientIds: [6] }));

    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("정렬을 바꿀 때도 서버를 부르지 않는다", () => {
    const { result } = renderHook(() => useFilterQuery("/products"));

    act(() => result.current.setSort("PRICE_ASC"));

    expect(routerReplace).not.toHaveBeenCalled();
    expect(query().get("sort")).toBe("PRICE_ASC");
  });

  it("조건이 아닌 쿼리는 그대로 둔다", () => {
    searchParams.current = new URLSearchParams("mode=ingredient");
    const { result } = renderHook(() => useFilterQuery("/search/ingredients"));

    act(() => result.current.setCondition({ includeIngredientIds: [6] }));

    expect(query().get("mode")).toBe("ingredient");
    expect(query().get("includeIngredientIds")).toBe("6");
  });

  it("조건을 모두 비우면 주소에 조건을 남기지 않는다", () => {
    searchParams.current = new URLSearchParams("includeIngredientIds=6");
    const { result } = renderHook(() => useFilterQuery("/search/ingredients"));

    act(() => result.current.setCondition({ includeIngredientIds: [] }));

    expect(query().has("includeIngredientIds")).toBe(false);
  });
});
