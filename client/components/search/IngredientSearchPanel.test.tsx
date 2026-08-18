/**
 * @vitest-environment jsdom
 */
import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IngredientSearchPanel } from "./IngredientSearchPanel";

import { EMPTY_FILTER, type Filter } from "@/lib/domain/filter";

const excludeCodes: readonly ExcludeCodeResponse[] = [
  {
    code: "FRAGRANCE_ALLERGENS",
    name: "향료/알레르기 성분 제외",
    description: "착향 목적의 성분입니다.",
    ingredients: [{ id: 101, koreanName: "리모넨", englishName: "Limonene" }],
  },
];

const setup = (filter: Filter = EMPTY_FILTER) => {
  const onChange = vi.fn();
  render(
    <IngredientSearchPanel
      filter={filter}
      onChange={onChange}
      excludeCodes={excludeCodes}
      names={new Map([[6, "판테놀"]])}
      onLearnNames={() => {}}
    />,
  );
  return { onChange };
};

/** 자동완성 결과가 나오도록 검색어를 넣는다. 목 서버가 판테놀(6)을 돌려준다. */
const search = async () => {
  await userEvent.type(screen.getByRole("searchbox"), "판");
  return screen.findByRole("button", { name: "포함" });
};

describe("IngredientSearchPanel", () => {
  it("포함을 고르면 포함 조건에 담는다", async () => {
    const { onChange } = setup();
    await userEvent.click(await search());

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [6],
      excludeIngredientIds: [],
    });
  });

  it("제외를 고르면 이미 담긴 포함 조건에서 뺀다", async () => {
    // 판테놀이 포함 조건에 있는 상태에서 제외를 누른다.
    const { onChange } = setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    await search();

    await userEvent.click(screen.getByRole("button", { name: "제외" }));

    expect(onChange).toHaveBeenCalledWith({
      excludeIngredientIds: [6],
      includeIngredientIds: [],
    });
  });

  it("포함을 고르면 이미 담긴 제외 조건에서 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, excludeIngredientIds: [6] });

    await userEvent.click(await search());

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [6],
      excludeIngredientIds: [],
    });
  });

  it("이미 고른 조건을 다시 누르면 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });

    await userEvent.click(await search());

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [],
      excludeIngredientIds: [],
    });
  });

  it("고른 조건만 눌린 상태로 보여 준다", async () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    await search();

    expect(screen.getByRole("button", { name: "포함" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "제외" })).toHaveAttribute("aria-pressed", "false");
  });

  it("빠른 필터는 설명 없이 라벨만 보여 준다", () => {
    setup();

    expect(screen.getByRole("checkbox", { name: /향료\/알레르기 성분 제외/ })).toBeInTheDocument();
    expect(screen.queryByText("착향 목적의 성분입니다.")).not.toBeInTheDocument();
  });
});
