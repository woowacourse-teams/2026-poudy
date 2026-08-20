/**
 * @vitest-environment jsdom
 */
import type { ExcludeCodeResponse } from "@poudy/api/api.zod";
import { render, screen, waitFor, within } from "@testing-library/react";
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
    />,
  );
  return { onChange };
};

/**
 * 자동완성이 뜨도록 검색어를 넣는다.
 * 결과가 여러 개라 성분 이름으로 행을 특정한 뒤 그 안의 버튼을 찾는다.
 */
const search = async (name = "판테놀") => {
  await userEvent.type(screen.getByRole("textbox", { name: "성분 검색" }), "판");

  const row = await waitFor(() => {
    const list = screen.getByRole("list", { name: "성분 검색 결과" });
    const found = within(list).getByText(name).closest("li");
    if (!found) throw new Error(`${name} 행을 찾지 못했습니다`);
    return found;
  });

  return within(row);
};

describe("IngredientSearchPanel", () => {
  it("입력하기 전에는 자동완성을 띄우지 않는다", () => {
    setup();

    expect(screen.queryByRole("list", { name: "성분 검색 결과" })).not.toBeInTheDocument();
  });

  it("입력하면 입력 아래에 자동완성을 띄운다", async () => {
    setup();
    await search();

    expect(screen.getByRole("list", { name: "성분 검색 결과" })).toBeInTheDocument();
  });

  it("Esc 를 누르면 자동완성을 닫는다", async () => {
    setup();
    await search();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("list", { name: "성분 검색 결과" })).not.toBeInTheDocument());
  });

  it("바깥을 누르면 자동완성을 닫는다", async () => {
    setup();
    await search();

    await userEvent.click(screen.getByText("빠른 필터"));

    await waitFor(() => expect(screen.queryByRole("list", { name: "성분 검색 결과" })).not.toBeInTheDocument());
  });

  it("포함을 고르면 포함 조건에 담는다", async () => {
    const { onChange } = setup();
    const row = await search();
    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [6],
      excludeIngredientIds: [],
    });
  });

  it("제외를 고르면 이미 담긴 포함 조건에서 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    const row = await search();

    await userEvent.click(row.getByRole("button", { name: "판테놀 제외" }));

    expect(onChange).toHaveBeenCalledWith({
      excludeIngredientIds: [6],
      includeIngredientIds: [],
    });
  });

  it("포함을 고르면 이미 담긴 제외 조건에서 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, excludeIngredientIds: [6] });
    const row = await search();

    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [6],
      excludeIngredientIds: [],
    });
  });

  it("이미 고른 조건을 다시 누르면 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    const row = await search();

    await userEvent.click(row.getByRole("button", { name: "판테놀 포함" }));

    expect(onChange).toHaveBeenCalledWith({
      includeIngredientIds: [],
      excludeIngredientIds: [],
    });
  });

  it("고른 조건만 눌린 상태로 보여 준다", async () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });
    const row = await search();

    expect(row.getByRole("button", { name: "판테놀 포함" })).toHaveAttribute("aria-pressed", "true");
    expect(row.getByRole("button", { name: "판테놀 제외" })).toHaveAttribute("aria-pressed", "false");
  });

  it("담은 조건을 입력 안에 chip 으로 보여 준다", () => {
    setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });

    expect(screen.getByRole("button", { name: "판테놀 포함 조건 삭제" })).toBeInTheDocument();
  });

  it("chip 의 삭제를 누르면 그 조건만 뺀다", async () => {
    const { onChange } = setup({ ...EMPTY_FILTER, includeIngredientIds: [6] });

    await userEvent.click(screen.getByRole("button", { name: "판테놀 포함 조건 삭제" }));

    expect(onChange).toHaveBeenCalledWith({ includeIngredientIds: [] });
  });

  it("빠른 필터는 설명 없이 라벨만 보여 준다", () => {
    setup();

    expect(screen.getByRole("checkbox", { name: /향료\/알레르기 성분 제외/ })).toBeInTheDocument();
    expect(screen.queryByText("착향 목적의 성분입니다.")).not.toBeInTheDocument();
  });
});
