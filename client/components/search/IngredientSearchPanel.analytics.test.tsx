/**
 * @vitest-environment jsdom
 */
import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientSearchPanel } from "./IngredientSearchPanel";

import { track } from "@/lib/analytics/track";
import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const excludeCodes: readonly ExcludeCodeResponse[] = [
  {
    code: "FRAGRANCE_ALLERGENS",
    name: "향료/알레르기 성분 제외",
    description: "착향 목적의 성분입니다.",
    ingredients: [{ id: 6, koreanName: "판테놀", englishName: "Panthenol" }],
  },
];

const setup = (filter: Filter = EMPTY_FILTER) =>
  render(
    <IngredientSearchPanel
      filter={filter}
      onChange={vi.fn()}
      excludeCodes={excludeCodes}
      names={new Map([[6, "판테놀"]])}
    />,
  );

/** 자동완성 결과에서 판테놀 행을 찾는다. */
const searchRow = async () => {
  await userEvent.type(screen.getByRole("textbox", { name: "성분 검색" }), "판");

  const row = await waitFor(() => {
    const list = screen.getByRole("list", { name: "성분 검색 결과" });
    const found = within(list).getByText("판테놀").closest("li");
    if (!found) throw new Error("판테놀 행을 찾지 못했습니다");
    return found;
  });

  return within(row);
};

beforeEach(() => {
  vi.mocked(track).mockClear();
});

describe("IngredientSearchPanel 분석", () => {
  it("검색 결과가 오면 검색어와 결과 수를 남긴다", async () => {
    setup();
    await searchRow();

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith("search_used", {
        mode: "ingredient",
        query: "판",
        query_length: 1,
        result_count: expect.any(Number),
      }),
    );
  });

  it("자동완성에서 고르면 어떤 검색어에서 무엇을 골랐는지 남긴다", async () => {
    setup();
    const row = await searchRow();
    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(track).toHaveBeenCalledWith("search_suggestion_selected", {
      mode: "ingredient",
      query: "판",
      position: expect.any(Number),
      ingredient_id: 6,
    });
  });

  it("이미 담긴 조건을 빼는 것은 자동완성 선택으로 세지 않는다", async () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    const row = await searchRow();
    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(track).not.toHaveBeenCalledWith("search_suggestion_selected", expect.anything());
  });

  it("포함 조건을 켜면 어느 화면에서 무엇을 골랐는지 남긴다", async () => {
    setup();
    const row = await searchRow();
    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(track).toHaveBeenCalledWith("ingredient_condition_toggled", {
      ingredient_id: 6,
      condition: "include",
      action: "add",
      surface: "ingredient_search",
    });
  });

  it("이미 걸린 조건을 다시 누르면 뺀 것으로 남긴다", async () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    const row = await searchRow();
    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(track).toHaveBeenCalledWith("ingredient_condition_toggled", expect.objectContaining({ action: "remove" }));
  });

  it("제외한 성분군의 성분을 포함으로 고른 상태면 경고를 남긴다", async () => {
    setup({ ...EMPTY_FILTER, excludeCodes: ["FRAGRANCE_ALLERGENS"], includeIngredientIds: [6] });

    await waitFor(() =>
      expect(track).toHaveBeenCalledWith("filter_conflict_shown", {
        conflict_count: 1,
        ingredient_count: 1,
      }),
    );
  });

  it("모순이 없으면 경고를 남기지 않는다", async () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });

    await waitFor(() => expect(screen.getByText("빠른 필터")).toBeInTheDocument());
    expect(track).not.toHaveBeenCalledWith("filter_conflict_shown", expect.anything());
  });
});
