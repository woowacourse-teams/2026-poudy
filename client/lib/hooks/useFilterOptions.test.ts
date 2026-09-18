/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFilterOptions } from "./useFilterOptions";

import { fetchProducts } from "@/lib/api/products";
import { EMPTY_FILTER } from "@/lib/domain/filter";

vi.mock("@/lib/api/products", () => ({ fetchProducts: vi.fn() }));

const response = (name: string) => ({
  items: [],
  brands: [{ id: 1, name }],
  categories: [],
  skinTypes: [],
  pagination: { page: 0, size: 1, totalElements: 1, totalPages: 1, hasNext: false },
});

describe("선택지 요청 수명", () => {
  it("자기 조건 변경에는 재조회하지 않고 다른 조건 변경 시 오래된 응답을 무시한다", async () => {
    let completeOld!: (value: ReturnType<typeof response>) => void;
    vi.mocked(fetchProducts)
      .mockReset()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            completeOld = resolve;
          }),
      )
      .mockResolvedValueOnce(response("새 브랜드"));
    const { result, rerender } = renderHook((filter) => useFilterOptions(filter, "brand"), {
      initialProps: EMPTY_FILTER,
    });
    rerender({ ...EMPTY_FILTER, brandIds: [1] });
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    rerender({ ...EMPTY_FILTER, categoryIds: [3] });
    expect(result.current.result).toBeUndefined();
    await waitFor(() =>
      expect(result.current.result).toMatchObject({ status: "ready", options: { brands: [{ name: "새 브랜드" }] } }),
    );
    await act(async () => completeOld(response("이전 브랜드")));
    expect(result.current.result).toMatchObject({ status: "ready", options: { brands: [{ name: "새 브랜드" }] } });
  });
});
