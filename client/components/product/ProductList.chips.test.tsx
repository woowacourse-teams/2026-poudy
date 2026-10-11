/**
 * @vitest-environment jsdom
 */
import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

const params = { current: new URLSearchParams() };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => params.current,
}));

const excludeCodes = [
  {
    code: "FRAGRANCE_ALLERGENS",
    name: "향료 제외",
    description: "",
    ingredients: [
      { id: 1, koreanName: "가", englishName: "a" },
      { id: 2, koreanName: "나", englishName: "b" },
      { id: 3, koreanName: "다", englishName: "c" },
    ],
  },
] as unknown as readonly ExcludeCodeResponse[];

const setup = (query: string) => {
  params.current = new URLSearchParams(query);
  render(<ProductList excludeCodes={excludeCodes} />);
};

const chipCount = async () =>
  (await screen.findByRole("button", { name: /성분/ })).querySelector(".sr-only")?.textContent;

describe("성분 칩 숫자", () => {
  it("빠른 필터는 묶음이 아니라 안의 성분 수로 센다", async () => {
    setup("excludeCodes=FRAGRANCE_ALLERGENS");

    expect(await chipCount()).toBe("3개 선택됨");
  });

  it("낱개로 고른 성분을 더해서 센다", async () => {
    setup("excludeIngredientIds=99");

    expect(await chipCount()).toBe("1개 선택됨");
  });

  it("빠른 필터와 낱개가 겹치면 한 번만 센다", async () => {
    setup("excludeCodes=FRAGRANCE_ALLERGENS&excludeIngredientIds=2");

    expect(await chipCount()).toBe("3개 선택됨");
  });

  it("겹치지 않으면 모두 더한다", async () => {
    setup("excludeCodes=FRAGRANCE_ALLERGENS&excludeIngredientIds=99");

    expect(await chipCount()).toBe("4개 선택됨");
  });
});
