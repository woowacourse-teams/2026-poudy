/**
 * @vitest-environment jsdom
 */
import type { IngredientGroupResponse } from "@poudy/api/api.zod";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductList } from "./ProductList";

const params = { current: new URLSearchParams() };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => params.current,
}));

const excludeCodes: readonly IngredientGroupResponse[] = [
  {
    code: "FRAGRANCE_ALLERGENS",
    name: "향료 제외",
    englishName: null,
    description: "",
    ingredients: [
      { id: 1, koreanName: "가", englishName: "a" },
      { id: 2, koreanName: "나", englishName: "b" },
      { id: 3, koreanName: "다", englishName: "c" },
    ],
  },
];

const setup = (query: string) => {
  params.current = new URLSearchParams(query);
  render(<ProductList excludeCodes={excludeCodes} empty={<p>조건에 맞는 제품이 없어요</p>} />);
};

describe("필터 칩 값", () => {
  it("성분 조건이 걸리면 칩 이름 자리에 '성분 N'을 쓰고 이름과 값을 함께 읽는다", async () => {
    setup("excludeCodes=FRAGRANCE_ALLERGENS&excludeIngredientIds=99");

    const chip = await screen.findByRole("button", { name: "성분, 성분 2" });
    expect(chip).toHaveTextContent("성분 2");
    expect(chip).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("조건이 없으면 칩 이름만 보인다", async () => {
    setup("");

    expect(await screen.findByRole("button", { name: "성분" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("적용된 조건 줄", () => {
  it("포함과 제외를 줄로 나눠 성분 이름을 요약한다", async () => {
    setup("excludeCodes=FRAGRANCE_ALLERGENS");

    const group = await screen.findByRole("group", { name: "적용된 조건" });
    expect(group).toHaveTextContent("제외");
    expect(group).toHaveTextContent("향료 제외");
    expect(group).not.toHaveTextContent("포함");
  });

  it("성분 조건이 없으면 줄 전체를 숨긴다", () => {
    setup("brandIds=1");

    expect(screen.queryByRole("group", { name: "적용된 조건" })).not.toBeInTheDocument();
  });
});

describe("필터 초기화 버튼", () => {
  it("값이 걸린 칩이 없으면 두지 않는다", async () => {
    setup("keyword=크림");

    await screen.findByRole("button", { name: "성분" });
    expect(screen.queryByRole("button", { name: "필터 조건 모두 초기화" })).not.toBeInTheDocument();
  });

  it("칩 조건만 비우고 검색어와 정렬은 남기며, 포커스를 첫 칩으로 옮긴다", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    setup("keyword=크림&brandIds=1&excludeCodes=FRAGRANCE_ALLERGENS&moistureLevel=2&sort=PRICE_ASC");

    fireEvent.click(await screen.findByRole("button", { name: "필터 조건 모두 초기화" }));

    const url = new URL(String(replaceState.mock.lastCall?.[2]), "http://localhost");
    expect(url.searchParams.get("keyword")).toBe("크림");
    expect(url.searchParams.get("sort")).toBe("PRICE_ASC");
    expect(url.searchParams.has("brandIds")).toBe(false);
    expect(url.searchParams.has("excludeCodes")).toBe(false);
    expect(url.searchParams.has("moistureLevel")).toBe(false);
    expect(document.activeElement).toHaveAttribute("aria-haspopup", "dialog");
    replaceState.mockRestore();
  });
});
