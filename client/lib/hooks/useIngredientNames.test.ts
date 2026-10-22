/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useIngredientNames } from "./useIngredientNames";

import { server } from "@/mocks/server";

describe("useIngredientNames", () => {
  it("같은 성분이 여러 번 실려 와도 한 번씩만 묻는다. 서버는 중복 ID 를 400 으로 거절한다", async () => {
    const asked: string[][] = [];
    server.use(
      http.get("*/api/ingredients", ({ request }) => {
        const ids = new URL(request.url).searchParams.getAll("ingredientIds");
        asked.push(ids);
        if (new Set(ids).size !== ids.length)
          return HttpResponse.json({ code: "INVALID_QUERY_PARAMETER" }, { status: 400 });
        return HttpResponse.json({
          items: [{ id: 9292, koreanName: "세라마이드엔지", englishName: "Ceramide NG", skinEffects: [] }],
          pagination: { page: 1, size: 100, totalElements: 1, totalPages: 1, hasNext: false },
        });
      }),
    );

    const { result } = renderHook(() => useIngredientNames([9292, 9292]));

    await waitFor(() => expect(result.current.get(9292)).toBe("세라마이드엔지"));
    expect(asked).toEqual([["9292"]]);
  });
});
