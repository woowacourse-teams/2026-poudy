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

import { serializeFilter } from "@/lib/domain/filter";

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

  /*
   * 조건을 바꿀 때 옛 값이 `extra` 로 새어 들어가면 새 값 옆에 그대로 남는다. 피부 타입은
   * 하나만 고르는 조건이라 `skinType=OILY&skinType=DRY` 가 되어, 주소만 보아서는 무엇을
   * 골랐는지 알 수 없고 뒤로 가기로 돌아왔을 때 앞의 값을 읽는다.
   */
  it("한 번만 고르는 조건을 바꾸면 앞의 값이 남지 않는다", () => {
    searchParams.current = new URLSearchParams("skinType=OILY");
    const { result } = renderHook(() => useFilterQuery("/products"));

    act(() => result.current.setCondition({ skinType: "DRY" }));

    expect(query().getAll("skinType")).toEqual(["DRY"]);
  });

  /*
   * 조건을 새로 더할 때 키를 빠뜨리면 위와 같은 일이 생긴다. 직렬화가 만드는 키를 모두
   * 조건으로 알아보는지 여기에서 한꺼번에 지킨다.
   */
  it("직렬화가 만드는 키를 모두 조건으로 알아본다", () => {
    const serialized = serializeFilter({
      keyword: "토너",
      categoryIds: [3],
      brandIds: [1],
      moistureLevel: [2],
      oilLevel: [1],
      includeIngredientIds: [6],
      excludeIngredientIds: [7],
      excludeCodes: ["SULFATES"],
      skinType: "DRY",
      sort: "PRICE_ASC",
      page: 2,
      size: 40,
    });

    searchParams.current = new URLSearchParams(serialized.toString());
    const { result } = renderHook(() => useFilterQuery("/products"));

    act(() => result.current.setCondition({ keyword: "세럼" }));

    /* 조건으로 알아보지 못한 키는 옛 값과 새 값이 겹쳐 두 번 담긴다. */
    for (const key of new Set(serialized.keys())) {
      expect(query().getAll(key).length).toBeLessThanOrEqual(1);
    }
  });
});
